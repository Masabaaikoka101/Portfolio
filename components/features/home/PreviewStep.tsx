/**
 * プレビューステップコンポーネント
 *
 * このコンポーネントの役割:
 * - AI生成結果のプレビューと編集UI
 * - 保存・リセット機能へのアクセス
 *
 * Why 別コンポーネントとして分離するのか:
 * - ページコンポーネントをシンプルに保つ
 * - MercariPreviewへのprops渡しを整理
 * - リセットボタンの配置を一元管理
 *
 * 設計パターン:
 * - Container Component: MercariPreviewとリセットボタンをまとめる
 * - Props Forwarding: 多くのpropsをMercariPreviewに転送
 *
 * Note:
 * - editable={true}で編集モードを有効化
 * - MercariPreviewは表示専用モードも対応（履歴詳細ページで使用）
 *
 * Learning:
 * - React Props Drilling: https://react.dev/learn/passing-props-to-a-component
 */

"use client";

import { MercariPreview } from "@/components/mercari-preview";
import type { ItemStatus, BatchItem } from "@/types";

interface PreviewStepProps {
    /** 処理済み画像リスト */
    processedImages: (string | null)[];
    /** オリジナル画像リスト */
    originalImages: string[];
    /** テキスト分析中フラグ */
    isAnalyzing: boolean;
    /** 現在のプレビュー位置 */
    currentPreviewIndex: number;
    /** プレビュー位置変更コールバック */
    setCurrentPreviewIndex: (index: number) => void;

    /** 商品タイトル */
    title: string;
    /** 商品説明文 */
    description: string;
    /** 価格 */
    price: number;
    /** 商品の状態 */
    status: ItemStatus | "";
    /** 保存中フラグ */
    isSaving: boolean;
    /** タイトル変更コールバック */
    setTitle: (value: string) => void;
    /** 説明文変更コールバック */
    setDescription: (value: string) => void;
    /** 価格変更コールバック */
    setPrice: (value: number) => void;
    /** 状態変更コールバック */
    setStatus: (value: ItemStatus | "") => void;
    /** 保存ボタンクリックコールバック */
    onSave: () => void;
    /** リセットボタンクリックコールバック */
    onReset: () => void;
    /** 画像編集ボタンクリックコールバック */
    onEditImage: () => void;
    /** 出品モード */
    mode?: "single" | "batch";
    /** バッチアイテムリスト */
    batchItems?: BatchItem[];
    /** バッチアイテム更新コールバック */
    updateBatchItem?: (index: number, updates: Partial<BatchItem>) => void;
    /** 並び替えコールバック */
    onReorder?: (newOrderIndices: number[]) => void;
    /** 画像追加コールバック */
    onAddImage?: (files: File[]) => void;
    /** 画像削除コールバック */
    onDeleteImage?: (index: number) => void;
    /** アイテムごとの分析状態 */
    analyzingStates?: boolean[];
}

/**
 * プレビューステップコンポーネント
 */
export function PreviewStep({
    processedImages,
    originalImages,
    isAnalyzing,
    currentPreviewIndex,
    setCurrentPreviewIndex,
    title,
    description,
    price,
    status,
    isSaving,
    setTitle,
    setDescription,
    setPrice,
    setStatus,
    onSave,
    onReset,
    onEditImage,
    mode = "single",
    batchItems = [],
    updateBatchItem,
    onReorder,
    onAddImage,
    onDeleteImage,
    analyzingStates,
}: PreviewStepProps) {
    // 各画像の処理状態 (nullなら処理中)
    const loadingStates = processedImages.map(img => img === null);

    // バッチモードの場合は現在のインデックスのアイテムデータを使用
    const isBatch = mode === "batch";
    const currentBatchItem = isBatch ? batchItems[currentPreviewIndex] : null;

    // 表示する値の解決
    const displayTitle = isBatch ? (currentBatchItem?.title || "") : title;
    const displayDescription = isBatch ? (currentBatchItem?.description || "") : description;
    const displayPrice = isBatch ? (currentBatchItem?.price || 0) : price;
    const displayStatus = isBatch ? (currentBatchItem?.status || "") : status;

    // 更新ハンドラー
    const handleTitleChange = (val: string) => {
        if (isBatch && updateBatchItem) {
            updateBatchItem(currentPreviewIndex, { title: val });
        } else {
            setTitle(val);
        }
    };

    const handleDescriptionChange = (val: string) => {
        if (isBatch && updateBatchItem) {
            updateBatchItem(currentPreviewIndex, { description: val });
        } else {
            setDescription(val);
        }
    };

    const handlePriceChange = (val: number) => {
        if (isBatch && updateBatchItem) {
            updateBatchItem(currentPreviewIndex, { price: val });
        } else {
            setPrice(val);
        }
    };

    const handleStatusChange = (val: ItemStatus | "") => {
        if (isBatch && updateBatchItem) {
            // ItemStatus | "" だが、BatchItem.status は ItemStatus なのでキャストが必要か、
            // もしくは updateBatchItem が Partial<BatchItem> なので型チェックが厳密。
            // ItemStatus として扱う。
            if (val !== "") {
                updateBatchItem(currentPreviewIndex, { status: val as ItemStatus });
            }
        } else {
            setStatus(val);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* メインプレビュー */}
            <div>
                <h2 className="text-lg font-semibold mb-4 text-gray-700">
                    {isBatch ? `出品プレビュー (${currentPreviewIndex + 1}/${processedImages.length})` : "出品プレビュー"}
                    <span className="text-sm font-normal text-blue-600 ml-2">
                        (編集可能)
                    </span>
                </h2>
                <MercariPreview
                    images={processedImages}
                    originalImages={originalImages}
                    loadingStates={loadingStates}
                    isAnalyzing={mode === "batch" ? (analyzingStates?.[currentPreviewIndex] ?? false) : isAnalyzing}
                    selectedIndex={currentPreviewIndex}
                    onImageSelect={setCurrentPreviewIndex}
                    title={displayTitle}
                    description={displayDescription}
                    price={displayPrice}
                    status={displayStatus as ItemStatus}
                    onSave={onSave}
                    isSaving={isSaving}
                    editable={true}
                    onTitleChange={handleTitleChange}
                    onDescriptionChange={handleDescriptionChange}
                    onPriceChange={handlePriceChange}
                    onStatusChange={(value) => handleStatusChange(value)}
                    onEditImage={onEditImage}
                    mode={mode}
                    onReorder={onReorder}
                    onAddImage={onAddImage}
                    onDeleteImage={onDeleteImage}
                />
            </div>

            {/* リセットリンク */}
            <div className="flex justify-center pt-4">
                <button
                    onClick={onReset}
                    className="text-sm text-gray-500 hover:text-red-500 underline"
                >
                    リセットしてやり直す
                </button>
            </div>
        </div>
    );
}
