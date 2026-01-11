/**
 * 商品リスト管理フック
 *
 * このフックの役割:
 * - 商品一覧の取得
 * - 商品の削除（楽観的更新）
 * - アンドゥ機能
 *
 * Why カスタムフックに分離するのか:
 * - データ取得・削除ロジックをUIから分離
 * - アンドゥ機能の複雑なタイマー管理を隠蔽
 * - 単体テストが容易
 */

import { useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Item } from "@/types";

interface UseItemListReturn {
    /** 商品リスト */
    items: Item[];
    /** ローディング中かどうか */
    loading: boolean;
    /** 削除中かどうか */
    isDeleting: boolean;
    /** 商品を再取得 */
    fetchItems: () => Promise<void>;
    /** 選択した商品を削除 */
    deleteItems: (ids: Set<string>) => void;
    /** 削除を取り消し */
    undoDelete: () => void;
    /** アンドゥUIを表示するか */
    showUndo: boolean;
}

const UNDO_TIMEOUT_MS = 5000;

/**
 * 商品リスト管理フック
 */
export function useItemList(): UseItemListReturn {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deletedItems, setDeletedItems] = useState<Item[]>([]);
    const [showUndo, setShowUndo] = useState(false);
    const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    /**
     * 商品一覧を取得
     */
    const fetchItems = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("items")
            .select("id, image_url, title, description, price, status, created_at")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching items:", error);
            toast.error("商品の取得に失敗しました");
        } else {
            setItems(data || []);
        }
        setLoading(false);
    }, []);

    /**
     * 選択した商品を削除（楽観的更新 + アンドゥ対応）
     */
    const deleteItems = useCallback(
        (ids: Set<string>) => {
            if (ids.size === 0) return;

            const itemsToDelete = items.filter((item) => ids.has(item.id));
            const remainingItems = items.filter((item) => !ids.has(item.id));

            // 楽観的更新（UIを先に更新）
            setItems(remainingItems);
            setDeletedItems(itemsToDelete);
            setShowUndo(true);

            // 既存のタイムアウトをクリア
            if (undoTimeoutRef.current) {
                clearTimeout(undoTimeoutRef.current);
            }

            // 5秒後に実際にDBから削除
            undoTimeoutRef.current = setTimeout(() => {
                commitDelete(itemsToDelete);
            }, UNDO_TIMEOUT_MS);

            toast.success(`${itemsToDelete.length}件を削除しました`, {
                action: {
                    label: "元に戻す",
                    onClick: () => undoDelete(),
                },
                duration: UNDO_TIMEOUT_MS,
            });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [items]
    );

    /**
     * 実際にDBから削除
     */
    const commitDelete = useCallback(async (itemsToDelete: Item[]) => {
        setShowUndo(false);
        setIsDeleting(true);

        try {
            const { error } = await supabase
                .from("items")
                .delete()
                .in(
                    "id",
                    itemsToDelete.map((item) => item.id)
                );

            if (error) {
                console.error("Delete error:", error);
                // エラー時は復元
                setItems((prev) =>
                    [...itemsToDelete, ...prev].sort(
                        (a, b) =>
                            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )
                );
                toast.error("削除に失敗しました");
            }
        } finally {
            setIsDeleting(false);
            setDeletedItems([]);
        }
    }, []);

    /**
     * 削除を取り消し
     */
    const undoDelete = useCallback(() => {
        if (undoTimeoutRef.current) {
            clearTimeout(undoTimeoutRef.current);
        }

        // 削除したアイテムを復元
        setItems((prev) =>
            [...deletedItems, ...prev].sort(
                (a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
        );
        setDeletedItems([]);
        setShowUndo(false);
        toast.info("削除を取り消しました");
    }, [deletedItems]);

    return {
        items,
        loading,
        isDeleting,
        fetchItems,
        deleteItems,
        undoDelete,
        showUndo,
    };
}
