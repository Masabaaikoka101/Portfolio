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

import Link from "next/link";
import Image from "next/image";
import { ImageUploader } from "@/components/image-uploader";
import { ListingMode } from "@/hooks/use-item-form";
import { Layers, ChevronLeft, ArrowLeft } from "lucide-react";

/**
 * Props型
 */
interface EmptyStateProps {
    /** 画像選択時のコールバック（複数） */
    onFilesSelect: (files: File[]) => void;
    /** モード変更時のコールバック */
    onModeChange: (mode: ListingMode) => void;
    /** 現在のモード */
    currentMode: ListingMode;
    /** モードが選択済みかどうか */
    isModeSelected: boolean;
    /** モード選択に戻る */
    onBack: () => void;
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
export function EmptyState({ onFilesSelect, onModeChange, currentMode, isModeSelected, onBack }: EmptyStateProps) {
    // ローカルstateは削除し、propsで制御する

    // モード選択ハンドラ
    const handleModeSelect = (mode: ListingMode) => {
        onModeChange(mode);
    };

    // モードが選択されていない場合はモード選択画面を表示
    if (!isModeSelected) {
        return (
            <div className="flex flex-col min-h-[400px] animate-in fade-in duration-500">
                <div className="w-full mb-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-lg font-bold text-gray-900 hover:text-gray-600 transition-colors py-2 rounded-lg"
                    >
                        <ArrowLeft className="w-6 h-6" />
                        作成一覧
                    </Link>
                </div>

                <div className="flex flex-col items-center justify-center flex-1 w-full">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">生成モードを選択</h2>
                        <p className="text-gray-500">
                            商品の数に合わせて最適なモードを選んでください<br />
                            AIが最適な画像・商品情報を生成します
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-6 w-full max-w-2xl px-4">
                        {/* 単品出品 */}
                        <button
                            onClick={() => handleModeSelect("single")}
                            className="group relative flex flex-col items-center p-4 sm:p-8 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-[#125DA7] transition-all duration-300 hover:shadow-xl"
                        >
                            <div className="relative w-16 h-16 sm:w-24 sm:h-24 mb-3 sm:mb-6 transition-transform duration-300 group-hover:scale-110">
                                <div className="absolute inset-0 bg-[#125DA7]/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <div className="relative z-10 w-full h-full flex items-center justify-center text-[#125DA7]">
                                    <Image
                                        src="/icons/single-mode.svg"
                                        alt="Single Listing"
                                        fill
                                        className="object-contain p-2 sm:p-4"
                                    />
                                </div>
                            </div>
                            <h3 className="text-sm sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2">単品生成</h3>
                            <p className="text-xs sm:text-sm text-gray-500 text-center">
                                １つの商品の出品に最適
                            </p>
                        </button>

                        {/* 一括出品 */}
                        <button
                            onClick={() => handleModeSelect("batch")}
                            className="group relative flex flex-col items-center p-4 sm:p-8 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-[#EE6E13] transition-all duration-300 hover:shadow-xl"
                        >
                            <div className="relative w-16 h-16 sm:w-24 sm:h-24 mb-3 sm:mb-6 transition-transform duration-300 group-hover:scale-110">
                                <div className="absolute inset-0 bg-[#EE6E13]/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <div className="relative z-10 w-full h-full flex items-center justify-center text-[#EE6E13]">
                                    <Layers className="w-8 h-8 sm:w-12 sm:h-12" />
                                </div>
                            </div>
                            <h3 className="text-sm sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2">まとめて生成</h3>
                            <p className="text-xs sm:text-sm text-gray-500 text-center">
                                複数の商品の出品に最適
                            </p>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // モードが選択されている場合はアップローダーを表示
    // 戻るボタンのハンドリングが必要かどうか？ (onModeChangeでリセットすれば良い)
    // ここでは単純にUploaderを表示するが、戻るボタン機能のためにonBack的なものを渡すか、
    // あるいは単純に onModeChange で null 相当のことをしてもらうか？
    // useItemForm側で isModeSelected を false にする関数が必要。

    return (
        <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6 flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
                >
                    <ChevronLeft className="w-4 h-4" />
                    モード選択に戻る
                </button>
                <span className="text-sm font-medium text-gray-900">
                    {currentMode === "single" ? "単品出品モード" : "一括出品モード"}
                </span>
            </div>

            <div className="max-w-xl mx-auto bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
                <ImageUploader
                    onFilesSelect={onFilesSelect}
                    className="aspect-square md:aspect-[4/3]"
                    maxFiles={5}
                />
            </div>
        </div>
    );
}
