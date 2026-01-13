/**
 * 背景選択ステップコンポーネント
 *
 * このコンポーネントの役割:
 * - 商品画像の背景スタイルを選択する
 * - AI分析を開始するボタンを提供
 *
 * 設計パターン:
 * - Controlled Component: backgroundTypeを親から受け取る
 * - Callback Props: onStartAnalysis, onBack, setBackgroundTypeで親に通知
 */

"use client";

import Image from "next/image";
import { ArrowLeft, Sparkles, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * 背景タイプの定義
 */
const BACKGROUND_OPTIONS = [
    { id: "white", name: "白スタジオ", image: null },
    { id: "canvas", name: "キャンバス", image: "/backgrounds/canvas.jpeg" },
    { id: "dark-wood", name: "ダークウッド", image: "/backgrounds/dark-wood.jpeg" },
    { id: "light-wood", name: "ライトウッド", image: "/backgrounds/light-wood.jpeg" },
    { id: "marble", name: "大理石", image: "/backgrounds/marble.jpeg" },
] as const;

/**
 * Props型
 */
interface BackgroundSelectionStepProps {
    /** 現在選択されている背景タイプ */
    backgroundType: string;
    /** 背景タイプ変更時のコールバック */
    setBackgroundType: (type: string) => void;
    /** 分析開始ボタンクリック時のコールバック */
    onStartAnalysis: () => void;
    /** 前のステップへ戻るコールバック */
    onBack: () => void;
    /** 画像変更（リセット）コールバック */
    onReset?: () => void;
}

/**
 * 背景選択ステップコンポーネント
 */
export function BackgroundSelectionStep({
    backgroundType,
    setBackgroundType,
    onStartAnalysis,
    onBack,
    onReset,
}: BackgroundSelectionStepProps) {
    return (
        <div className="max-w-xl mx-auto bg-white p-4 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-4">
                {/* ヘッダー */}
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-600 mb-2">
                        <Palette className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">背景スタイルを選択</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        AIが商品の背景を自動で調整します
                    </p>
                </div>

                {/* 背景スタイル選択 */}
                <div className="space-y-2">
                    <Label className="text-sm">背景スタイル</Label>
                    <div className="grid grid-cols-5 gap-2">
                        {BACKGROUND_OPTIONS.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setBackgroundType(option.id)}
                                className={cn(
                                    "relative aspect-square rounded-xl overflow-hidden border-3 transition-all",
                                    "group",
                                    backgroundType === option.id
                                        ? "border-purple-500 ring-4 ring-purple-200 scale-105 z-10"
                                        : "border-gray-200 hover:border-gray-300 hover:scale-102"
                                )}
                            >
                                {option.image ? (
                                    <Image
                                        src={option.image}
                                        alt={option.name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-white flex items-center justify-center">
                                        <span className="text-xs text-gray-400 font-medium">白</span>
                                    </div>
                                )}
                                {backgroundType === option.id && (
                                    <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                                        <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                )}
                                {option.id === "white" && (
                                    <div className="absolute top-0 right-0 z-20">
                                        <span className="text-[10px] font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 px-1.5 py-0.5 rounded-bl-lg shadow-sm block">
                                            推奨
                                        </span>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                        選択中: <span className="font-medium text-gray-700">{BACKGROUND_OPTIONS.find((o) => o.id === backgroundType)?.name || "白スタジオ"}</span>
                    </p>
                </div>

                {/* ナビゲーションボタン */}
                <div className="flex gap-3 pt-1">
                    <Button
                        variant="outline"
                        onClick={onBack}
                        className="flex-1 py-5 text-gray-600"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        戻る
                    </Button>
                    <Button
                        onClick={onStartAnalysis}
                        className="flex-1 py-5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold"
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        AIで生成開始
                    </Button>
                </div>

                {/* 画像変更リンク */}
                {onReset && (
                    <button
                        onClick={onReset}
                        className="w-full text-sm text-gray-400 hover:text-gray-600 underline mt-1 pb-2"
                    >
                        画像を変更する
                    </button>
                )}
            </div>
        </div>
    );
}
