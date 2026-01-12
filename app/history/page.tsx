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
import { Reorder } from "framer-motion";
import { ItemCard } from "@/components/item-card";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, CheckSquare, Square, X, GripVertical } from "lucide-react";
import { useItemList } from "@/hooks/use-item-list";
import { useItemSelection } from "@/hooks/use-item-selection";
import { useBatchAnalysis } from "@/hooks/use-batch-analysis";
import { Skeleton } from "@/components/ui/skeleton";

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
        reorderItems,
    } = useItemList();

    // 複数選択
    const {
        selectedIds,
        handleItemClick: handleSelectionClick,
        toggleSelection,
        selectRange,
        lastClickedIndex: lastSelectedIndex,
        toggleSelectAll,
        clearSelection,
        selectedCount,
        isAllSelected,
    } = useItemSelection({ items, isEditMode });

    // 一括生成処理
    const { isProcessing: isBatchProcessing, progress, currentStep, processBatch } = useBatchAnalysis();

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

    // 一括生成ハンドラ
    const handleBatchGenerate = async () => {
        if (selectedIds.size === 0 || selectedIds.size > 3) return;

        // 選択されたIDからアイテム配列を生成
        const targetItems = items.filter(item => selectedIds.has(item.id));

        const successCount = await processBatch(targetItems);

        if (successCount > 0) {
            clearSelection();
            setIsEditMode(false);
            fetchItems(); // リスト更新
            router.refresh(); // Server Component部分はリフレッシュ
        }
    };

    // アイテム選択ハンドラ（クリック、Shift+クリック）
    // アイテム選択ハンドラ（クリック、Shift+クリック）
    const handleItemClick = (index: number, e: React.MouseEvent) => {
        if (!isEditMode) {
            router.push(`/items/${items[index].id}`);
            return;
        }

        // イベント伝播とデフォルト動作を防止
        e.preventDefault();
        e.stopPropagation();

        // フックのハンドラに委譲
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
                        <div className="flex gap-2">

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
                                削除 ({selectedCount})
                            </Button>
                        </div>
                    </div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="flex flex-col gap-2">
                                <Skeleton className="aspect-[3/4] w-full rounded-xl" />
                                <Skeleton className="h-4 w-2/3" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        ))}
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
                ) : isEditMode ? (
                    /* 選択モード: ドラッグ&ドロップで並び替え可能（縦リスト表示） */
                    <Reorder.Group
                        axis="y"
                        values={items}
                        onReorder={reorderItems}
                        className="flex flex-col gap-2"
                        as="div"
                    >
                        {items.map((item, index) => (
                            <Reorder.Item
                                key={item.id}
                                value={item}
                                className="relative bg-white rounded-xl border border-gray-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                                whileDrag={{ scale: 1.02, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", zIndex: 50 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            >
                                <div className="flex items-center gap-4">
                                    {/* ドラッグハンドル */}
                                    <div className="flex-shrink-0 text-gray-400 hover:text-gray-600">
                                        <GripVertical className="h-5 w-5" />
                                    </div>
                                    {/* 順番表示 */}
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                                        {index + 1}
                                    </div>
                                    {/* サムネイル */}
                                    <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                                        <img
                                            src={item.image_url}
                                            alt={item.title}
                                            className="w-full h-full object-cover pointer-events-none"
                                            draggable={false}
                                        />
                                    </div>
                                    {/* 商品情報 */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-medium text-gray-900 truncate">
                                            {item.title}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            ¥{item.price.toLocaleString()}
                                        </p>
                                    </div>
                                    {/* チェックボックス */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleItemClick(index, e);
                                        }}
                                        className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                                    >
                                        {selectedIds.has(item.id) ? (
                                            <CheckSquare className="h-5 w-5 text-blue-600" />
                                        ) : (
                                            <Square className="h-5 w-5 text-gray-400" />
                                        )}
                                    </button>
                                </div>
                            </Reorder.Item>
                        ))}
                    </Reorder.Group>
                ) : (
                    /* 通常モード: テキスト選択可能、クリックで詳細へ */
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {items.map((item, index) => (
                            <div
                                key={item.id}
                                className="relative"
                                onClick={(e) => handleItemClick(index, e)}
                            >
                                <ItemCard
                                    imageUrl={item.image_url}
                                    title={item.title}
                                    price={item.price}
                                    status={item.status || "目立った傷や汚れなし"}
                                    createdAt={item.created_at}
                                    isEditMode={false}
                                    className="transition-transform"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {/* バッチ処理中のオーバーレイ */}
            {isBatchProcessing && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
                        <div className="flex flex-col items-center text-center">
                            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 mb-2">
                                AI一括生成中...
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                {currentStep}
                            </p>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                                <div
                                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-gray-500">
                                ブラウザを閉じないでください
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
