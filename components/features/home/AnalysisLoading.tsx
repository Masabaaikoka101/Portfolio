/**
 * AI分析ローディングコンポーネント
 *
 * モダンでミニマルなシマーローディングを実装
 * - グラデーションシマー効果
 * - 小さく洗練されたテキスト
 * - スケルトンプレビュー
 */

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * AI分析ローディングコンポーネント
 */
export function AnalysisLoading() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <div
                className={cn(
                    "flex flex-col items-center transition-all duration-700 ease-out",
                    mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                )}
            >
                {/* スケルトンプレビューカード */}
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-6 w-full max-w-sm">
                    {/* 画像スケルトン with シマー */}
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 mb-4">
                        <div className="absolute inset-0 shimmer-effect" />
                        {/* 中央のパルスリング */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full border-4 border-gray-200" />
                                <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
                            </div>
                        </div>
                    </div>

                    {/* テキストスケルトン */}
                    <div className="space-y-3">
                        <div className="h-4 bg-gray-100 rounded-full w-3/4 shimmer-effect" />
                        <div className="h-3 bg-gray-100 rounded-full w-full shimmer-effect" />
                        <div className="h-3 bg-gray-100 rounded-full w-5/6 shimmer-effect" />
                    </div>

                    {/* ステータステキスト */}
                    <div className="mt-6 text-center">
                        <p className="text-sm font-medium text-gray-500 tracking-wide">
                            AIが分析中
                        </p>
                        <div className="flex items-center justify-center gap-1 mt-2">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* シマーエフェクト用CSS */}
            <style jsx>{`
                .shimmer-effect {
                    background: linear-gradient(
                        90deg,
                        transparent 0%,
                        rgba(255, 255, 255, 0.4) 50%,
                        transparent 100%
                    );
                    background-size: 200% 100%;
                    animation: shimmer 1.5s infinite;
                }

                @keyframes shimmer {
                    0% {
                        background-position: -200% 0;
                    }
                    100% {
                        background-position: 200% 0;
                    }
                }
            `}</style>
        </main>
    );
}
