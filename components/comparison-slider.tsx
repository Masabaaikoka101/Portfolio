/**
 * 画像比較コンポーネント
 *
 * このコンポーネントの役割:
 * - Before/After画像の切り替え表示
 * - ボタンを押している間だけBeforeを表示
 *
 * Why スライダーからボタンに変更したか:
 * - 画像のサイズが異なる場合、スライダーだと背景がはみ出て見える
 * - ボタン長押しの方がシンプルで直感的
 *
 * Learning:
 * - onMouseDown/onMouseUp: ボタン押下状態の追跡
 */

"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Props型
 */
interface ComparisonSliderProps {
    /** 編集前の画像（オリジナル） */
    imageBefore: string;
    /** 編集後の画像（AI処理済み） */
    imageAfter: string;
    /** 追加のCSSクラス */
    className?: string;
}

/**
 * 画像比較コンポーネント
 */
export function ComparisonSlider({
    imageBefore,
    imageAfter,
    className,
}: ComparisonSliderProps) {
    /** Beforeボタンを押している状態 */
    const [showBefore, setShowBefore] = useState(false);

    return (
        <div
            className={cn(
                "relative w-full aspect-[4/3] select-none overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white",
                className
            )}
        >
            {/* 画像表示 */}
            <div className="absolute inset-0 h-full w-full">
                <Image
                    src={showBefore ? imageBefore : imageAfter}
                    alt={showBefore ? "Before" : "After"}
                    fill
                    className="object-contain transition-opacity duration-150"
                    draggable={false}
                    unoptimized
                />
            </div>

            {/* ラベル */}
            <div className={cn(
                "absolute top-4 right-4 px-2 py-1 text-xs rounded-md backdrop-blur-sm",
                showBefore
                    ? "bg-gray-600/70 text-white"
                    : "bg-blue-600/80 text-white"
            )}>
                {showBefore ? "Before（元画像）" : "After（AI加工後）"}
            </div>

            {/* Before表示ボタン */}
            <button
                type="button"
                onMouseDown={() => setShowBefore(true)}
                onMouseUp={() => setShowBefore(false)}
                onMouseLeave={() => setShowBefore(false)}
                onTouchStart={() => setShowBefore(true)}
                onTouchEnd={() => setShowBefore(false)}
                className={cn(
                    "absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-md backdrop-blur-sm",
                    "bg-white/80 text-gray-600",
                    "hover:bg-white active:bg-gray-100",
                    "border border-gray-200"
                )}
            >
                長押しでBefore
            </button>
        </div>
    );
}
