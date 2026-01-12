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
    /** 最後にクリックしたインデックス */
    lastClickedIndex: number | null;
    /** アイテムクリック時のハンドラー（Hook内蔵） */
    handleItemClick: (index: number, e: React.MouseEvent) => void;
    /** 単一選択のトグル */
    toggleSelection: (itemId: string) => void;
    /** 範囲選択 */
    selectRange: (index: number) => void;
    /** 全選択/全解除トグル */
    toggleSelectAll: () => void;
    /** 選択をクリア */
    clearSelection: () => void;
    /** 選択数 */
    selectedCount: number;
    /** 全選択済みかどうか */
    isAllSelected: boolean;
}

export function useItemSelection<T extends { id: string }>({
    items,
    isEditMode,
}: UseItemSelectionOptions<T>): UseItemSelectionReturn {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

    /**
     * 単一選択のトグル
     */
    const toggleSelection = useCallback((itemId: string) => {
        setSelectedIds(prev => {
            const newSelected = new Set(prev);
            if (newSelected.has(itemId)) {
                newSelected.delete(itemId);
            } else {
                newSelected.add(itemId);
            }
            return newSelected;
        });
    }, []);

    /**
     * 範囲選択
     */
    const selectRange = useCallback((currentIndex: number) => {
        if (lastClickedIndex === null) return;

        const start = Math.min(lastClickedIndex, currentIndex);
        const end = Math.max(lastClickedIndex, currentIndex);

        const idsToAdd = new Set<string>();
        for (let i = start; i <= end; i++) {
            idsToAdd.add(items[i].id);
        }

        setSelectedIds(prev => {
            const newSelected = new Set(prev);
            idsToAdd.forEach(id => newSelected.add(id));
            return newSelected;
        });
    }, [items, lastClickedIndex]);

    /**
     * アイテムクリックハンドラー（互換性、Hook内部ロジック用）
     */
    const handleItemClick = useCallback(
        (index: number, e: React.MouseEvent) => {
            if (!isEditMode) return;

            const itemId = items[index].id;

            if (e.shiftKey && lastClickedIndex !== null) {
                // Shift+クリック: 範囲選択
                selectRange(index);
            } else if (e.ctrlKey || e.metaKey) {
                // Ctrlキー: 単体トグルと同じだが、lastClickedIndexを更新して選択状態を維持/反転
                // 今回の要件では toggleSelection を呼ぶ
                toggleSelection(itemId);
                setLastClickedIndex(index);
            } else {
                // 通常クリック: トグル
                toggleSelection(itemId);
                setLastClickedIndex(index);
            }
        },
        [isEditMode, items, lastClickedIndex, selectRange, toggleSelection]
    );

    // ... (rest is same)

    const toggleSelectAll = useCallback(() => {
        if (selectedIds.size === items.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(items.map((item) => item.id)));
        }
    }, [items, selectedIds.size]);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
        setLastClickedIndex(null);
    }, []);

    // Effect for Keyboard shortcuts... (omitted in this replace, assume existing)
    // Need to handle useEffect separately or include it? 
    // replacing from line 26 to ... end allows rewriting the logic.

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            // Ctrl+A
            if ((e.ctrlKey || e.metaKey) && e.key === "a") {
                if (isEditMode && items.length > 0) {
                    e.preventDefault();
                    setSelectedIds(new Set(items.map((item) => item.id)));
                }
            }
            // Escape
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
        toggleSelection,
        selectRange,
        toggleSelectAll,
        clearSelection,
        selectedCount: selectedIds.size,
        isAllSelected: selectedIds.size === items.length && items.length > 0,
    };
}
