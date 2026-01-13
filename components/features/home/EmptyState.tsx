/**
 * 空状態コンポーネント（初期画面）
 *
 * このコンポーネントの役割:
 * - 出品モード（単品/一括）の選択
 * - 画像アップロードの受付
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

import { useState } from "react";
import { ImageUploader } from "@/components/image-uploader";
import { ListingMode } from "@/hooks/use-item-form";
import { Image as ImageIcon, Layers, ChevronLeft } from "lucide-react";

/**
 * Props型
 */
interface EmptyStateProps {
    /** 画像選択時のコールバック（複数） */
    onFilesSelect: (files: File[]) => void;
    /** モード変更時のコールバック */
    onModeChange: (mode: ListingMode) => void;
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
export function EmptyState({ onFilesSelect, onModeChange }: EmptyStateProps) {
    const [selectedMode, setSelectedMode] = useState<ListingMode | null>(null);

    const handleModeSelect = (mode: ListingMode) => {
        setSelectedMode(mode);
        onModeChange(mode);
    };

    const handleBackInfoModeSelection = () => {
        setSelectedMode(null);
        onModeChange("single"); // デフォルトに戻す
    };

    if (selectedMode === null) {
        return (
            <div className="max-w-4xl mx-auto px-4">
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">出品方法を選択</h1>
                    <p className="text-gray-600">AIがあなたの商品出品をサポートします</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                    {/* 単品出品モード */}
                    <button
                        onClick={() => handleModeSelect("single")}
                        className="flex flex-col items-center p-8 bg-white rounded-2xl border-2 border-transparent hover:border-blue-500 shadow-sm hover:shadow-md transition-all group text-left"
                    >
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <ImageIcon className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">単品出品</h3>
                        <p className="text-sm text-gray-500 text-center leading-relaxed">
                            1つの商品を丁寧に出品します。<br />
                            詳細なAI分析と編集が可能です。
                        </p>
                    </button>

                    {/* 一括出品モード */}
                    {/* 一括出品モード */}
                    <button
                        onClick={() => handleModeSelect("batch")}
                        className="flex flex-col items-center p-8 bg-white rounded-2xl border-2 border-transparent hover:border-blue-500 shadow-sm hover:shadow-md transition-all group text-left relative overflow-hidden"
                    >
                        <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Layers className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                            一括出品
                        </h3>
                        <p className="text-sm text-gray-500 text-center leading-relaxed">
                            複数の商品をまとめて出品します。<br />
                            設定を一括適用して高速に生成できます。
                        </p>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* ヘッダーテキスト */}
            <div className="text-center mb-8 relative">
                <button
                    onClick={handleBackInfoModeSelection}
                    className="absolute left-0 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {selectedMode === "single" ? "商品画像のアップロード" : "一括出品画像アップロード"}
                </h1>
                <p className="text-gray-600">
                    {selectedMode === "single"
                        ? "商品の写真をアップロードしてください"
                        : "出品したい商品のメイン画像をすべてアップロードしてください"}
                </p>
            </div>
            {/* アップローダーカード */}
            <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <ImageUploader
                    onFilesSelect={onFilesSelect}
                    className="aspect-[4/3]"
                    maxFiles={5}
                />
            </div>
        </>
    );
}
