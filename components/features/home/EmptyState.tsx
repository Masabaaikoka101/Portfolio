/**
 * 空状態コンポーネント（初期画面）
 *
 * このコンポーネントの役割:
 * - 画像がまだ選択されていない初期状態を表示
 * - ユーザーに画像アップロードを促す
 *
 * Why 別コンポーネントとして分離するのか:
 * - ページコンポーネント（page.tsx）をシンプルに保つ
 * - 各ステップを独立したコンポーネントとして管理
 * - 条件分岐による描画の切り替えを明確化
 *
 * 設計パターン:
 * - Step Component Pattern: フロー内の1ステップを表現
 * - Composition: ImageUploaderを組み合わせ
 *
 * Learning:
 * - React Composition: https://react.dev/learn/passing-props-to-a-component
 */

"use client";

import { ImageUploader } from "@/components/image-uploader";

/**
 * Props型
 */
interface EmptyStateProps {
    /** 画像選択時のコールバック（複数） */
    onFilesSelect: (files: File[]) => void;
}

/**
 * 空状態コンポーネント
 *
 * Why Fragmentを使うのか:
 * - 余計なDOMノードを追加しない
 * - レイアウトに影響を与えずに複数要素を返す
 *
 * @param props - コンポーネントのprops
 */
export function EmptyState({ onFilesSelect }: EmptyStateProps) {
    return (
        <>
            {/* ヘッダーテキスト */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">新規作成</h1>
                <p className="text-gray-600">商品の写真をアップロードしてください（最大3枚）</p>
            </div>
            {/* アップローダーカード */}
            <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <ImageUploader onFilesSelect={onFilesSelect} className="aspect-[4/3]" />
            </div>
        </>
    );
}
