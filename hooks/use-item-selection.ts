/**
 * 商品選択フック
 *
 * このフックの役割:
 * - 複数選択状態の管理
 * - Shift+クリック範囲選択
 * - Ctrl+クリック追加選択
 * - 全選択/全解除
 * - キーボードショートカット（Ctrl+A, Escape）
 *
 * Why カスタムフックに分離するのか:
 * - 選択ロジックはUI表示と独立したビジネスロジック
 * - 履歴ページ以外でも再利用可能
 * - 単体テストが容易
 */

import { useState, useCallback, useEffect } from "react";

interface UseItemSelectionOptions<T extends { id: string }> {
    /** 選択対象のアイテム配列 */
    items: T[];
    /** 編集モードかどうか */
    isEditMode: boolean;
}

interface UseItemSelectionReturn {
    /** 選択中のID Set */
    selectedIds: Set<string>;
    /** 最後にクリックしたインデックス（範囲選択用） */
    lastClickedIndex: number | null;
    /** アイテムクリック時のハンドラー */
    handleItemClick: (index: number, e: React.MouseEvent) => void;
    /** 全選択/全解除トグル */
    toggleSelectAll: () => void;
    /** 選択をクリア */
    clearSelection: () => void;
    /** 選択数 */
    selectedCount: number;
    /** 全選択済みかどうか */
    isAllSelected: boolean;
}

/**
 * 商品選択フック
 */
export function useItemSelection<T extends { id: string }>({
    items,
    isEditMode,
}: UseItemSelectionOptions<T>): UseItemSelectionReturn {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

    /**
     * アイテムクリックハンドラー
     *
     * 選択モード:
     * - Shift+クリック: 範囲選択
     * - Ctrl+クリック: 追加/削除選択
     * - 通常クリック: トグル
     */
    const handleItemClick = useCallback(
        (index: number, e: React.MouseEvent) => {
            if (!isEditMode) return;

            const itemId = items[index].id;

            if (e.shiftKey && lastClickedIndex !== null) {
                // Shift+クリック: 範囲選択
                const start = Math.min(lastClickedIndex, index);
                const end = Math.max(lastClickedIndex, index);
                const newSelected = new Set(selectedIds);
                for (let i = start; i <= end; i++) {
                    newSelected.add(items[i].id);
                }
                setSelectedIds(newSelected);
            } else if (e.ctrlKey || e.metaKey) {
                // Ctrl+クリック: 追加/削除選択
                const newSelected = new Set(selectedIds);
                if (newSelected.has(itemId)) {
                    newSelected.delete(itemId);
                } else {
                    newSelected.add(itemId);
                }
                setSelectedIds(newSelected);
                setLastClickedIndex(index);
            } else {
                // 通常クリック: トグル
                const newSelected = new Set(selectedIds);
                if (newSelected.has(itemId)) {
                    newSelected.delete(itemId);
                } else {
                    newSelected.add(itemId);
                }
                setSelectedIds(newSelected);
                setLastClickedIndex(index);
            }
        },
        [isEditMode, items, selectedIds, lastClickedIndex]
    );

    /**
     * 全選択/全解除トグル
     */
    const toggleSelectAll = useCallback(() => {
        if (selectedIds.size === items.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(items.map((item) => item.id)));
        }
    }, [items, selectedIds.size]);

    /**
     * 選択をクリア
     */
    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
        setLastClickedIndex(null);
    }, []);

    /**
     * キーボードショートカット
     * - Ctrl+A: 全選択
     * - Escape: 選択解除
     */
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 入力フィールドにフォーカス中は無視
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            // Ctrl+A: 全選択（編集モード時）
            if ((e.ctrlKey || e.metaKey) && e.key === "a") {
                if (isEditMode && items.length > 0) {
                    e.preventDefault();
                    setSelectedIds(new Set(items.map((item) => item.id)));
                }
            }

            // Escape: 選択解除
            if (e.key === "Escape" && selectedIds.size > 0) {
                setSelectedIds(new Set());
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isEditMode, items, selectedIds.size]);

    return {
        selectedIds,
        lastClickedIndex,
        handleItemClick,
        toggleSelectAll,
        clearSelection,
        selectedCount: selectedIds.size,
        isAllSelected: selectedIds.size === items.length && items.length > 0,
    };
}
