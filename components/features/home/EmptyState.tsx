/**
 * 空状態コンポーネント（初期画面）
 *
 * このコンポーネントの役割:
 * - 画像がまだ選択されていない初期状態を表示
 * - ユーザーに画像アップロードを促す
 * - 複数画像のアップロードに対応
 *
 * Why 別コンポーネントとして分離するのか:
 * - ページコンポーネント（page.tsx）をシンプルに保つ
 * - 各ステップを独立したコンポーネントとして管理
 * - 条件分岐による描画の切り替えを明確化
 *
 * 設計パターン:
 * - Step Component Pattern: フロー内の1ステップを表現
 * - Composition: MultiImageUploaderを組み合わせ
 *
 * Learning:
 * - React Composition: https://react.dev/learn/passing-props-to-a-component
 */

"use client";

import {
    MultiImageUploader,
    ImagePreview,
} from "@/components/features/multi-image-uploader";

/**
 * Props型
 */
interface EmptyStateProps {
    /** 複数画像変更時のコールバック */
    onImagesChange: (images: ImagePreview[]) => void;
}

/**
 * 空状態コンポーネント
 *
 * @param props - コンポーネントのprops
 */
export function EmptyState({ onImagesChange }: EmptyStateProps) {
    return (
        <>
            {/* ヘッダーテキスト */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">新規作成</h1>
                <p className="text-gray-600">
                    同じ商品のいろいろな角度から撮った写真も使えます（最大10枚）
                </p>
            </div>
            {/* アップローダーカード */}
            <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <MultiImageUploader
                    images={[]}
                    onImagesChange={onImagesChange}
                />
            </div>
        </>
    );
}

