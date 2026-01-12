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
    /** 商品の並び替え（UI上のみ、DB保存なし） */
    reorderItems: (newItems: Item[]) => void;
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
     * 削除されたアイテムの参照（クロージャ問題を回避するため）
     * Why: toastのコールバックに渡されるundoDeleteが呼ばれた時点で
     *      最新のdeletedItemsを参照できるようにする
     */
    const deletedItemsRef = useRef<Item[]>([]);

    /**
     * 商品一覧を取得
     * 
     * Note: sort_orderが設定されている場合はその順序、
     * そうでない場合は作成日時順でソート
     */
    const fetchItems = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("items")
            .select("id, image_url, title, description, price, status, created_at, sort_order")
            .order("sort_order", { ascending: true, nullsFirst: false })
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
     * 削除を取り消し
     * 
     * Note: この関数はdeletedItemsRefを参照するため、
     *       コールバックとして渡されても最新の状態を取得できる
     */
    const undoDelete = useCallback(() => {
        if (undoTimeoutRef.current) {
            clearTimeout(undoTimeoutRef.current);
            undoTimeoutRef.current = null;
        }

        const itemsToRestore = deletedItemsRef.current;

        if (itemsToRestore.length === 0) {
            console.warn("No items to restore");
            return;
        }

        // 削除したアイテムを復元
        setItems((prev) =>
            [...itemsToRestore, ...prev].sort(
                (a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
        );

        // 状態をクリア
        deletedItemsRef.current = [];
        setDeletedItems([]);
        setShowUndo(false);

        toast.info("削除を取り消しました");
    }, []);

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
            deletedItemsRef.current = [];
            setDeletedItems([]);
        }
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

            // Refも更新（undoDelete用）
            deletedItemsRef.current = itemsToDelete;

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
                    onClick: undoDelete,
                },
                duration: UNDO_TIMEOUT_MS,
            });
        },
        [items, commitDelete, undoDelete]
    );

    /**
     * 商品の並び替え（DBに保存）
     * 
     * Note: 選択モード時のドラッグ&ドロップ用
     * 並び順はDBに保存され、リロードしても維持される
     */
    const reorderItems = useCallback(async (newItems: Item[]) => {
        // UIを先に更新（楽観的更新）
        setItems(newItems);

        // DBに並び順を保存
        const updates = newItems.map((item, index) => ({
            id: item.id,
            sort_order: index,
        }));

        // 各アイテムのsort_orderを更新
        for (const update of updates) {
            const { error } = await supabase
                .from("items")
                .update({ sort_order: update.sort_order })
                .eq("id", update.id);

            if (error) {
                console.error("Error updating sort order:", error);
            }
        }
    }, []);

    return {
        items,
        loading,
        isDeleting,
        fetchItems,
        deleteItems,
        undoDelete,
        showUndo,
        reorderItems,
    };
}

