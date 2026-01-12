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
import type { ItemStatus } from "@/types";

/**
 * Props型
 *
 * Why 多くのpropsを受け取るのか:
 * - フォーム状態は親（useItemForm）で管理
 * - このコンポーネントは表示・イベント転送に専念
 * - 状態管理とUIの関心を分離
 */
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
}: PreviewStepProps) {
    // 各画像の処理状態 (nullなら処理中)
    const loadingStates = processedImages.map(img => img === null);

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* メインプレビュー */}
            <div>
                <h2 className="text-lg font-semibold mb-4 text-gray-700">
                    出品プレビュー
                    <span className="text-sm font-normal text-blue-600 ml-2">
                        (編集可能)
                    </span>
                </h2>
                <MercariPreview
                    images={processedImages}
                    originalImages={originalImages}
                    loadingStates={loadingStates}
                    isAnalyzing={isAnalyzing}
                    selectedIndex={currentPreviewIndex}
                    onImageSelect={setCurrentPreviewIndex}
                    title={title}
                    description={description}
                    price={price}
                    status={status as ItemStatus}
                    onSave={onSave}
                    isSaving={isSaving}
                    editable={true}
                    onTitleChange={setTitle}
                    onDescriptionChange={setDescription}
                    onPriceChange={setPrice}
                    onStatusChange={(value) => setStatus(value)}
                    onEditImage={onEditImage}
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
