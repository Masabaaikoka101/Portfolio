/**
 * 画像比較スライダーコンポーネント
 *
 * このコンポーネントの役割:
 * - Before/After画像を横並びで比較表示
 * - ドラッグで境界線を移動して比較範囲を調整
 * - マウス・タッチ両対応
 *
 * Why このコンポーネントを作るのか:
 * - AI画像編集の効果をユーザーに視覚的に伝える
 * - 「Before/After」形式は変化が分かりやすく、満足度向上に寄与
 *
 * 設計パターン:
 * - CSS clip-path を使用して画像を切り抜き
 * - グローバルイベントリスナーでドラッグを追跡
 *
 * Alternatives:
 * - ライブラリ（react-compare-image等）を使う方法もあるが、
 *   学習目的とカスタマイズ性を考慮して自作
 *
 * Learning:
 * - CSS clip-path: https://developer.mozilla.org/ja/docs/Web/CSS/clip-path
 * - getBoundingClientRect: https://developer.mozilla.org/ja/docs/Web/API/Element/getBoundingClientRect
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { ChevronsLeftRight } from "lucide-react";
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
 * 画像比較スライダーコンポーネント
 *
 * アルゴリズム:
 * 1. position（0-100%）でスライダー位置を管理
 * 2. Before画像をclip-pathで左から切り抜き
 * 3. After画像は背景として全体表示
 * 4. ドラッグでpositionを更新
 *
 * @param props - コンポーネントのprops
 */
export function ComparisonSlider({
    imageBefore,
    imageAfter,
    className,
}: ComparisonSliderProps) {
    /** スライダー位置（0-100%）、初期値は中央 */
    const [position, setPosition] = useState(50);

    /** ドラッグ中フラグ */
    const [isResizing, setIsResizing] = useState(false);

    /** コンテナへの参照（位置計算用） */
    const containerRef = useRef<HTMLDivElement>(null);

    /**
     * 位置計算
     *
     * What this does:
     * - クリック/ドラッグ位置からスライダー位置（%）を計算
     * - 0-100の範囲にクリップ
     */
    const handleMove = useCallback(
        (clientX: number) => {
            if (!containerRef.current) return;
            const { left, width } = containerRef.current.getBoundingClientRect();
            const x = clientX - left;
            const newPos = Math.min(Math.max((x / width) * 100, 0), 100);
            setPosition(newPos);
        },
        []
    );

    // =========================================================================
    // イベントハンドラー
    // =========================================================================
    const onMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isResizing) return;
            handleMove(e.clientX);
        },
        [isResizing, handleMove]
    );

    const onTouchMove = useCallback(
        (e: TouchEvent) => {
            if (!isResizing) return;
            handleMove(e.touches[0].clientX);
        },
        [isResizing, handleMove]
    );

    const onMouseUp = useCallback(() => {
        setIsResizing(false);
    }, []);

    /**
     * グローバルイベントリスナーの登録/解除
     *
     * Why windowにイベントを登録するのか:
     * - ドラッグ中にマウスがコンテナ外に出ても追跡を継続
     * - より自然なドラッグ操作を実現
     *
     * Why useEffect内で登録/解除するのか:
     * - isResizing状態に応じて動的に追加/削除
     * - メモリリーク防止のためcleanupで解除
     */
    useEffect(() => {
        if (isResizing) {
            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("touchmove", onTouchMove);
            window.addEventListener("mouseup", onMouseUp);
            window.addEventListener("touchend", onMouseUp);
        }
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("mouseup", onMouseUp);
            window.removeEventListener("touchend", onMouseUp);
        };
    }, [isResizing, onMouseMove, onTouchMove, onMouseUp]);

    // =========================================================================
    // レンダリング
    // =========================================================================
    return (
        <div
            ref={containerRef}
            className={cn(
                "relative w-full aspect-[4/3] select-none overflow-hidden rounded-xl border border-gray-200 shadow-sm",
                className
            )}
            onMouseDown={(e) => {
                setIsResizing(true);
                handleMove(e.clientX);
            }}
            onTouchStart={(e) => {
                setIsResizing(true);
                handleMove(e.touches[0].clientX);
            }}
        >
            {/* After画像（背景として全体表示） */}
            <div className="absolute inset-0 h-full w-full">
                <Image
                    src={imageAfter}
                    alt="After"
                    fill
                    className="object-cover"
                    draggable={false}
                    unoptimized
                    // シンプルな「プロ風」フィルターをシミュレート
                    style={{ filter: 'brightness(1.08) contrast(1.05) saturate(1.1)' }}
                />
                <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 text-xs rounded-md backdrop-blur-sm">
                    After (AI Processed)
                </div>
            </div>

            {/* Before画像（clip-pathで左から切り抜き） */}
            <div
                className="absolute inset-0 h-full w-full z-10"
                style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
            >
                <Image
                    src={imageBefore}
                    alt="Before"
                    fill
                    className="object-cover"
                    draggable={false}
                    unoptimized
                />
                <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 text-xs rounded-md backdrop-blur-sm">
                    Before
                </div>
            </div>

            {/* スライダーハンドル */}
            <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.3)] cursor-ew-resize z-20 flex items-center justify-center pointer-events-none"
                style={{ left: `${position}%` }}
            >
                <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center shadow-lg transform -translate-x-1/2 text-gray-600">
                    <ChevronsLeftRight className="w-4 h-4" />
                </div>
            </div>
        </div>
    );
}
