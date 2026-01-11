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

/**
 * Props型
 *
 * Why 多くのpropsを受け取るのか:
 * - フォーム状態は親（useItemForm）で管理
 * - このコンポーネントは表示・イベント転送に専念
 * - 状態管理とUIの関心を分離
 */
interface PreviewStepProps {
    /** 処理済み画像URL */
    processedImage: string;
    /** オリジナル画像URL（比較用） */
    originalImage: string;
    /** 複数画像データ（追加） */
    images?: { preview: string }[];
    /** 商品タイトル */
    title: string;
    /** 商品説明文 */
    description: string;
    /** 価格 */
    price: number;
    /** 保存中フラグ */
    isSaving: boolean;
    /** 画像編集中フラグ */
    isEditingImage?: boolean;
    /** タイトル変更コールバック */
    setTitle: (value: string) => void;
    /** 説明文変更コールバック */
    setDescription: (value: string) => void;
    /** 価格変更コールバック */
    setPrice: (value: number) => void;
    /** 保存ボタンクリックコールバック */
    onSave: () => void;
    /** リセットボタンクリックコールバック */
    onReset: () => void;
    /** オリジナル画像に戻すコールバック */
    onRestore?: () => void;
    /** 追加画像の一括背景生成コールバック */
    onProcessAdditionalImages?: () => void;
    /** 一括処理の進捗 */
    editProgress?: number;
    /** 一括処理の総数 */
    editTotal?: number;
}

/**
 * プレビューステップコンポーネント
 *
 * @param props - コンポーネントのprops
 */
export function PreviewStep({
    processedImage,
    originalImage,
    images = [],
    title,
    description,
    price,
    isSaving,
    isEditingImage = false,
    setTitle,
    setDescription,
    setPrice,
    onSave,
    onReset,
    onRestore,
    onProcessAdditionalImages,
    editProgress = 0,
    editTotal = 0,
}: PreviewStepProps) {
    // 表示用画像リストの生成
    // AI処理済み画像がある場合、リストの先頭（メイン画像）を置き換える
    const displayImages = images.length > 0
        ? images.map((img, index) => index === 0 && processedImage ? processedImage : img.preview)
        : [processedImage];

    // 一括生成ボタンの表示条件（2枚以上の画像がある場合）
    const canProcessAdditional = images.length > 1 && onProcessAdditionalImages;

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
                    image={processedImage} // 後方互換性のため維持
                    images={displayImages} // 新規実装: 複数画像リスト
                    originalImage={originalImage}
                    title={title}
                    description={description}
                    price={price}
                    onSave={onSave}
                    isSaving={isSaving}
                    editable={true}
                    onTitleChange={setTitle}
                    onDescriptionChange={setDescription}
                    onPriceChange={setPrice}
                    onRestore={onRestore}
                    canRestore={!!processedImage && !!originalImage}
                    onProcessAdditionalImages={onProcessAdditionalImages}
                    canProcessAdditional={canProcessAdditional}
                    editProgress={editProgress}
                    editTotal={editTotal}
                    isEditingImage={isEditingImage}
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
