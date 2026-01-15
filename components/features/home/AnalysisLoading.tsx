/**
 * AI分析ローディングコンポーネント
 *
 * このコンポーネントの役割:
 * - AI分析中のローディング画面を表示
 * - ユーザーに待機状態を視覚的に伝える
 *
 * Why 専用のローディングコンポーネントを作るのか:
 * - AI処理は数秒〜十数秒かかるため、単純なスピナーでは不十分
 * - プレミアム感のあるアニメーションでUXを向上
 * - ブランドイメージの構築
 *
 * アニメーション設計:
 * - mounted状態でフェードイン（初期表示時のチラつき防止）
 * - ドットアニメーション（「生成中...」の視覚的フィードバック）
 * - プログレスバー（処理が進行中であることを示す）
 *
 * Alternatives:
 * - Skeleton Loading: ページ構造が決まっている場合に有効
 * - Spinner: シンプルだが、長時間待機には不向き
 *
 * Learning:
 * - CSS Keyframes: https://developer.mozilla.org/ja/docs/Web/CSS/@keyframes
 * - styled-jsx: https://github.com/vercel/styled-jsx
 */

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * AI分析ローディングコンポーネント
 *
 * Why mounted状態を使うのか:
 * - SSR時のハイドレーションミスマッチを防止
 * - マウント後にアニメーションを開始することで滑らかな表示
 */
export function AnalysisLoading() {
    /** マウント完了フラグ（フェードイン用） */
    const [mounted, setMounted] = useState(false);

    /** ドットアニメーション用状態 */
    const [dots, setDots] = useState("");

    /**
     * アニメーション初期化
     *
     * What this does:
     * 1. マウント完了を設定（フェードイン開始）
     * 2. 500msごとにドットを更新（...→空→.→..→...）
     */
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
        const interval = setInterval(() => {
            setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return (
        <main className="min-h-screen bg-white flex items-center justify-center">
            <div
                className={cn(
                    "flex flex-col items-center transition-all duration-1000 ease-out",
                    mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                )}
            >
                {/* メインテキスト */}
                <div className="relative">
                    {/* 背景のグロー効果 */}
                    <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-50 animate-pulse" />
                    <h2 className="relative text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-6">
                        生成中
                        <span className="inline-block w-8 text-blue-600">{dots}</span>
                    </h2>
                </div>

                {/* サブテキスト */}
                <p className="text-gray-400 text-sm font-medium tracking-wide uppercase">
                    AI IS ANALYZING YOUR ITEM
                </p>

                {/* プログレスバー */}
                <div className="mt-12 w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 animate-[loading_1.5s_ease-in-out_infinite]" />
                </div>

                {/* カスタムキーフレームアニメーション */}
                <style jsx global>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(0%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
            </div>
        </main>
    );
}
