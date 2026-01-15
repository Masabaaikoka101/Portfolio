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

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Reorder, useDragControls } from "framer-motion";
import { ItemCard } from "@/components/item-card";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, CheckSquare, Square, X, GripVertical, Download, Camera, Package } from "lucide-react";
import { useItemList } from "@/hooks/use-item-list";
import { useItemSelection } from "@/hooks/use-item-selection";
import { useBatchJob } from "@/contexts/BatchJobContext";
import { useBatchAnalysis } from "@/hooks/use-batch-analysis";
import { Skeleton } from "@/components/ui/skeleton";
import { useBulkDownload } from "@/hooks/use-bulk-download";
import type { Item } from "@/types";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";


/**
 * ドラッグ操作可能な履歴アイテムコンポーネント
 * 
 * Why: useDragControlsフックは各アイテムコンポーネント内で呼び出す必要があるため分離
 */
interface DraggableHistoryItemProps {
    item: Item;
    index: number;
    isSelected: boolean;
    onClick: (index: number, e: React.MouseEvent) => void;
    priority?: boolean;
}

function DraggableHistoryItem({ item, index, isSelected, onClick, priority = false }: DraggableHistoryItemProps) {
    const controls = useDragControls();

    return (
        <Reorder.Item
            value={item}
            dragListener={false} // デフォルトのドラッグを無効化
            dragControls={controls} // コントロールを紐付け
            className="relative bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition-shadow group"
            whileDrag={{ scale: 1.02, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", zIndex: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            id={`item-${item.id}`} // テストとデバッグ用にIDを追加
        >
            <div
                className="flex items-center gap-4 cursor-pointer"
                onClick={(e) => onClick(index, e)}
            >
                {/* ドラッグハンドル: ここをタッチ/クリックした時だけドラッグ開始 */}
                <div
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-2 -ml-2 cursor-grab active:cursor-grabbing touch-none"
                    onPointerDown={(e) => controls.start(e)}
                >
                    <GripVertical className="h-5 w-5" />
                </div>

                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                    {index + 1}
                </div>
                <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100 relative">
                    <Image
                        src={item.image_url}
                        alt={item.title}
                        fill
                        className="object-cover pointer-events-none"
                        sizes="64px"
                        draggable={false}
                        priority={priority}
                    />
                    {/* ホバー時の白オーバーレイ */}
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-25 transition-opacity duration-200 pointer-events-none" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                        {item.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                        ¥{item.price.toLocaleString()}
                    </p>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClick(index, e);
                    }}
                    className="flex-shrink-0 h-12 w-12 -mr-2 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                >
                    {isSelected ? (
                        <CheckSquare className="h-6 w-6 text-blue-600" />
                    ) : (
                        <Square className="h-6 w-6 text-gray-400" />
                    )}
                </button>
            </div>
            {/* 処理中オーバーレイ（簡易版） */}
            {(item.is_processing || item.title === "生成中...") && (
                <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-xl pointer-events-none">
                    <span className="text-xs text-gray-600 font-bold bg-white/80 px-2 py-1 rounded-full">生成中...</span>
                </div>
            )}
        </Reorder.Item>
    );
}

export default function HistoryPage() {
    const router = useRouter();
    const [isEditMode, setIsEditMode] = useState(false);

    // OAuthコールバック処理（Supabaseがルートページにリダイレクトした場合）
    const oauthProcessedRef = useRef(false);
    const [isRedirecting, setIsRedirecting] = useState(false);

    useEffect(() => {
        // 二重実行防止
        if (oauthProcessedRef.current) return;

        // URLハッシュにaccess_tokenがあるかチェック
        const hash = window.location.hash;
        if (hash && hash.includes("access_token")) {
            oauthProcessedRef.current = true;
            setIsRedirecting(true);

            const handleOAuthCallback = async () => {
                console.log("[HistoryPage] OAuth token detected in URL hash, processing...");

                // セッション確立を待つ
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error("[HistoryPage] OAuth error:", error);
                    toast.error("認証に失敗しました");
                    setIsRedirecting(false);
                    return;
                }

                if (session) {
                    console.log("[HistoryPage] Session established, reloading");
                    toast.success("認証が完了しました");
                    // ハッシュを消してリロード（またはそのまま表示）
                    // ここはルートページなので、リロードしてハッシュを消すのが良い
                    window.location.href = "/";
                } else {
                    setIsRedirecting(false);
                }
            };

            handleOAuthCallback();
        }
    }, []);



    // 商品リスト管理
    const {
        items,
        loading,
        isDeleting,
        fetchItems,
        deleteItems,
        reorderItems,
        hasMore,
        loadMore,
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

    // 無限スクロール用
    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    loadMore();
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            observer.disconnect();
        };
    }, [hasMore, loading, loadMore]);

    // 一括生成処理 (Contextから取得)
    const { isProcessing, progress, total } = useBatchJob();
    const { processBatch } = useBatchAnalysis();

    // 一括ダウンロード
    const { isDownloading, downloadItems } = useBulkDownload();

    // 処理中のアイテムがあるかどうか
    const hasProcessingItems = items.some(item => item.is_processing);

    // 進捗が進むたびにリストを更新
    useEffect(() => {
        if (progress > 0) {
            fetchItems();
        }
    }, [progress, fetchItems]);

    // 処理中のアイテムがある場合、定期的にリストを更新
    useEffect(() => {
        if (!hasProcessingItems) return;

        const intervalId = setInterval(() => {
            fetchItems();
        }, 2000); // 2秒ごとに更新

        return () => clearInterval(intervalId);
    }, [hasProcessingItems, fetchItems]);

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

    // 一括ダウンロードハンドラ
    const handleBulkDownload = async () => {
        // selectedIds (Set<string>) を Array に変換してフィルタリング
        const selectedIdsArray = Array.from(selectedIds);
        const targetItems = items.filter(item => selectedIdsArray.includes(item.id));

        await downloadItems(targetItems);

        // ダウンロード後は選択モードを維持するか解除するか？
        // ユーザーガイドライン的には維持の方が親切かもしれないが、完了した感出すなら解除もあり。
        // ここでは維持する。
    };

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

    // 一括生成中の残りアイテム数（スケルトン表示用）
    const pendingCount = isProcessing ? Math.max(0, total - progress) : 0;

    if (isRedirecting) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">認証処理中...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="container max-w-5xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">作成一覧</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-blue-600">
                                作成済みの下書き ({items.length})
                            </p>
                            {isProcessing && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full animate-pulse">
                                    AI生成中... {progress}/{total}
                                </span>
                            )}
                        </div>
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
                                variant="outline"
                                size="sm"
                                onClick={handleBulkDownload}
                                disabled={selectedCount === 0 || isDownloading}
                                className="border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                                {isDownloading ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                    <Download className="h-4 w-4 mr-1" />
                                )}
                                ダウンロード ({selectedCount})
                            </Button>

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
                {loading && items.length === 0 ? (
                    <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="flex flex-col gap-2">
                                <Skeleton className="aspect-[3/4] w-full rounded-xl" />
                                <Skeleton className="h-4 w-2/3" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : items.length === 0 && !isProcessing ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="bg-gray-100 p-4 rounded-full mb-4">
                            <Package className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">
                            まだ作成済みアイテムはありません
                        </h3>
                        <p className="text-sm text-gray-500">
                            右上の「新規作成」ボタンから出品の準備をはじめましょう
                        </p>
                    </div>
                ) : (
                    <div className={isEditMode ? "" : "grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4"}>

                        {/* 生成中スケルトン (通常モード時のみグリッド表示) */}
                        {!isEditMode && pendingCount > 0 && [...Array(pendingCount)].map((_, i) => (
                            <div key={`skeleton-${i}`} className="flex flex-col gap-2">
                                {/* MercariPreviewスタイルに統一した生成中アニメーション */}
                                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                                    {/* プレースホルダー */}
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <Camera className="h-12 w-12" />
                                    </div>

                                    {/* 薄い白オーバーレイ + パルスアニメーション */}
                                    <div className="absolute inset-0 bg-white/60 animate-pulse z-20 flex items-center justify-center">
                                        <span className="text-sm text-white font-medium drop-shadow-lg">生成中...</span>
                                    </div>
                                </div>
                                <Skeleton className="h-4 w-2/3" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        ))}

                        {isEditMode ? (
                            /* 選択モード */
                            <Reorder.Group
                                axis="y"
                                values={items}
                                onReorder={reorderItems}
                                className="flex flex-col gap-2"
                                as="div"
                            >
                                {items.map((item, index) => (
                                    <DraggableHistoryItem
                                        key={item.id}
                                        item={item}
                                        index={index}
                                        isSelected={selectedIds.has(item.id)}
                                        onClick={handleItemClick}
                                        priority={index < 4}
                                    />
                                ))}
                            </Reorder.Group>
                        ) : (
                            /* 通常モード */
                            items.map((item, index) => (
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
                                        isProcessing={item.is_processing || item.title === "生成中..."}
                                        className="transition-transform"
                                        priority={index < 4}
                                    />
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* 無限スクロール用トリガー & ローディング表示 */}
                {!isEditMode && hasMore && (
                    <div
                        ref={observerTarget}
                        className="flex justify-center py-8 w-full"
                    >
                        {loading && (
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}

// Helper for shimmers (inline for simplicity, but cleaner extracted)
