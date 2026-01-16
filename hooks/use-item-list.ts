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

import { useState, useCallback, useRef, useEffect } from "react";
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
    /** さらに読み込むデータがあるか */
    hasMore: boolean;
    /** 追加読み込み */
    loadMore: () => void;
}

const UNDO_TIMEOUT_MS = 3000;

/**
 * 商品リスト管理フック
 */
export function useItemList(): UseItemListReturn {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [, setDeletedItems] = useState<Item[]>([]);
    const [showUndo, setShowUndo] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const ITEMS_PER_PAGE = 24;

    const itemsRef = useRef<Item[]>(items);
    const pageRef = useRef<number>(page);
    const CACHE_KEY = "mercari_ai_items_cache";

    useEffect(() => {
        itemsRef.current = items;
        // キャッシュの保存
        if (typeof window !== 'undefined' && items.length > 0) {
            try {
                // 容量エラー回避のため、最新の1ページ分のみをキャッシュする
                // 生成中のアイテムはキャッシュしない（古い状態を表示しないため）
                const itemsToCache = items
                    .filter(item => !item.is_processing)
                    .slice(0, ITEMS_PER_PAGE);
                sessionStorage.setItem(CACHE_KEY, JSON.stringify(itemsToCache));
            } catch (e) {
                // 容量オーバーの場合は警告を出して無視する（アプリをクラッシュさせない）
                console.warn("Failed to save cache (QuotaExceededError):", e);
            }
        }
    }, [items]);

    useEffect(() => {
        pageRef.current = page;
    }, [page]);

    // キャッシュの復元は無効化
    // 理由: キャッシュからの古いデータが一瞬表示され、その後サーバーデータで置き換わるとちらつきが発生するため
    // サーバーからのデータを常に信頼する方式に変更
    // useEffect(() => {
    //     if (typeof window !== 'undefined') {
    //         try {
    //             const cached = sessionStorage.getItem(CACHE_KEY);
    //             if (cached) {
    //                 const parsed = JSON.parse(cached);
    //                 if (Array.isArray(parsed) && parsed.length > 0) {
    //                     const sanitized = parsed.map((item: Item) => ({
    //                         ...item,
    //                         is_processing: false
    //                     }));
    //                     setItems(sanitized);
    //                     setLoading(false);
    //                     const estimatedPage = Math.floor(parsed.length / ITEMS_PER_PAGE);
    //                     setPage(estimatedPage > 0 ? estimatedPage - 1 : 0);
    //                     setHasMore(parsed.length >= ITEMS_PER_PAGE);
    //                 } else {
    //                     setHasMore(false);
    //                 }
    //             }
    //         } catch (error) {
    //             console.warn("Failed to load cache", error);
    //         }
    //     }
    // }, []);

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
     * @param isLoadMore 追加読み込みかどうか
     */
    const fetchItems = useCallback(async (isLoadMore = false) => {
        // Refから最新の値を取得
        const currentItems = itemsRef.current;
        const currentPage = pageRef.current;

        if (!isLoadMore) {
            // キャッシュデータがない場合のみローディングを表示（SWRライクな挙動）
            if (currentItems.length === 0) {
                setLoading(true);
            }
        }

        // 次のページ番号を計算
        // 追加読み込みの場合は現在のページ + 1、それ以外（リセット）は 0
        const nextPage = isLoadMore ? currentPage + 1 : 0;
        const from = nextPage * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        try {
            // まず is_processing を含むクエリを試行
            const query = supabase
                .from("items")
                .select("id, image_url, title, description, price, status, created_at, sort_order, is_processing")
                .order("sort_order", { ascending: true, nullsFirst: true })
                .order("created_at", { ascending: false })
                .range(from, to);

            let { data, error } = await query;

            // is_processing カラムがない場合やその他のエラーでのフォールバック
            if (error) {
                console.warn("Primary query failed, using fallback query:", error.message);
                const fallbackQuery = supabase
                    .from("items")
                    .select("id, image_url, title, description, price, status, created_at, sort_order")
                    .order("sort_order", { ascending: true, nullsFirst: true })
                    .order("created_at", { ascending: false })
                    .range(from, to);

                const fallback = await fallbackQuery;

                if (!fallback.error) {
                    data = fallback.data?.map(item => ({ ...item, is_processing: false })) || null;
                    error = null; // フォールバック成功ならエラーをクリア
                } else {
                    // フォールバックも失敗した場合は元のエラーを優先（またはフォールバックのエラーを表示）
                    console.error("Fallback query also failed:", fallback.error);
                }
            }

            if (error) {
                // エラーオブジェクトの詳細をログ出力
                console.error("Error fetching items:", error.message || error);
                if (!isLoadMore) {
                    // 定期実行などで頻繁に出ないように制御するか、ユーザーへの通知は維持
                    // toast.error("商品の取得に失敗しました"); // 一旦コメントアウトして様子見、もしくは頻度を下げる
                }
            } else {
                const newItems = data || [];

                // 削除待機中のアイテムをフィルタリング（Undo猶予中に再取得しても復活させない）
                const pendingDeleteIds = new Set(deletedItemsRef.current.map(i => i.id));
                const filteredItems = newItems.filter(item => !pendingDeleteIds.has(item.id));

                if (isLoadMore) {
                    setItems(prev => [...prev, ...filteredItems]);
                } else {
                    setItems(filteredItems);
                }

                setPage(nextPage);
                setHasMore(newItems.length === ITEMS_PER_PAGE);
            }
        } catch (e) {
            console.error("Unexpected error in fetchItems:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * 追加読み込み
     */
    const loadMore = useCallback(() => {
        if (!loading && hasMore) {
            fetchItems(true);
        }
    }, [loading, hasMore, fetchItems]);

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
        hasMore,
        loadMore,
    };
}

