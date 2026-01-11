/**
 * 履歴ページ
 *
 * このページの役割:
 * - 作成済み商品の一覧表示
 * - 複数選択・削除機能（編集モード）
 * - アンドゥ機能付き削除
 *
 * リファクタリング:
 * - useItemList: 商品取得・削除・アンドゥ
 * - useItemSelection: 複数選択・範囲選択
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ItemCard } from "@/components/item-card";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, CheckSquare, Square, X } from "lucide-react";
import { useItemList } from "@/hooks/use-item-list";
import { useItemSelection } from "@/hooks/use-item-selection";

export default function HistoryPage() {
    const router = useRouter();
    const [isEditMode, setIsEditMode] = useState(false);

    // 商品リスト管理
    const {
        items,
        loading,
        isDeleting,
        fetchItems,
        deleteItems,
    } = useItemList();

    // 複数選択
    const {
        selectedIds,
        handleItemClick: handleSelectionClick,
        toggleSelectAll,
        clearSelection,
        selectedCount,
        isAllSelected,
    } = useItemSelection({ items, isEditMode });

    // 初回読み込み
    useEffect(() => {
        fetchItems();
        window.scrollTo({ top: 0, behavior: "auto" });
    }, [fetchItems]);

    // キーボードショートカット: Delete/Backspace で削除
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            // Escape: 編集モード終了
            if (e.key === "Escape" && isEditMode && selectedCount === 0) {
                setIsEditMode(false);
            }

            // Delete/Backspace: 削除
            if (
                (e.key === "Delete" || e.key === "Backspace") &&
                isEditMode &&
                selectedCount > 0
            ) {
                e.preventDefault();
                handleDelete();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditMode, selectedCount]);

    // 編集モードの切り替え
    const toggleEditMode = () => {
        if (isEditMode) {
            clearSelection();
        }
        setIsEditMode(!isEditMode);
    };

    // 選択した商品を削除
    const handleDelete = () => {
        deleteItems(selectedIds);
        clearSelection();
        setIsEditMode(false);
    };

    // アイテムクリック（編集モード時は選択、通常時は詳細へ）
    const handleItemClick = (index: number, e: React.MouseEvent) => {
        if (!isEditMode) {
            router.push(`/items/${items[index].id}`);
            return;
        }
        handleSelectionClick(index, e);
    };

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="container max-w-5xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">作成一覧</h1>
                        <p className="text-sm text-blue-600 mt-1">
                            作成済みの下書き ({items.length})
                        </p>
                    </div>
                    {items.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleEditMode}
                            className={
                                isEditMode
                                    ? "border-red-400 text-red-600 bg-red-50 hover:bg-red-100"
                                    : "border-gray-300 text-gray-700 hover:bg-gray-100"
                            }
                        >
                            {isEditMode ? (
                                <>
                                    <X className="h-4 w-4 mr-1" />
                                    キャンセル
                                </>
                            ) : (
                                "選択・削除"
                            )}
                        </Button>
                    )}
                </div>

                {/* Edit Mode Actions */}
                {isEditMode && items.length > 0 && (
                    <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 mb-4 animate-in fade-in duration-200">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={toggleSelectAll}
                                className="text-gray-600"
                            >
                                {isAllSelected ? (
                                    <>
                                        <CheckSquare className="h-4 w-4 mr-1 text-blue-600" />
                                        全解除
                                    </>
                                ) : (
                                    <>
                                        <Square className="h-4 w-4 mr-1" />
                                        全選択
                                    </>
                                )}
                            </Button>
                            <span className="text-sm text-gray-500">
                                {selectedCount}件選択中
                            </span>
                        </div>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDelete}
                            disabled={selectedCount === 0 || isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                                <Trash2 className="h-4 w-4 mr-1" />
                            )}
                            削除
                        </Button>
                    </div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-gray-500 mb-4">まだ作成がありません</p>
                        <Link href="/">
                            <Button className="bg-gray-900 text-white hover:bg-gray-800">
                                はじめての作成をする
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {items.map((item, index) => (
                            <div key={item.id} className="relative">
                                {isEditMode && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleItemClick(index, e);
                                        }}
                                        className="absolute top-2 left-2 z-10 h-6 w-6 rounded-full bg-white shadow-md flex items-center justify-center border border-gray-200"
                                    >
                                        {selectedIds.has(item.id) ? (
                                            <CheckSquare className="h-4 w-4 text-blue-600" />
                                        ) : (
                                            <Square className="h-4 w-4 text-gray-400" />
                                        )}
                                    </button>
                                )}
                                <ItemCard
                                    imageUrl={item.image_url}
                                    title={item.title}
                                    price={item.price}
                                    status={item.status || "目立った傷や汚れなし"}
                                    createdAt={item.created_at}
                                    isEditMode={isEditMode}
                                    onClick={(e) => handleItemClick(index, e as React.MouseEvent)}
                                    className={
                                        isEditMode && selectedIds.has(item.id)
                                            ? "ring-2 ring-blue-500 scale-[0.98] transition-transform"
                                            : "transition-transform"
                                    }
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
