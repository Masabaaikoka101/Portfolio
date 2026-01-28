/* eslint-disable react-hooks/set-state-in-effect */
/**
 * 商品カードコンポーネント
 *
 * このコンポーネントの役割:
 * - 履歴ページでの商品一覧表示
 * - 商品の画像、タイトル、価格、状態、日付を表示
 *
 * Why コンポーネントとして分離するのか:
 * - 商品カードは履歴ページで繰り返し使用される
 * - 将来的に検索結果やお気に入り一覧でも使用可能
 * - 一貫したデザインを保証
 *
 * 設計パターン:
 * - Presentational Component: 表示に特化、ロジックは持たない
 * - Props経由で全データを受け取る
 *
 * Learning:
 * - next/image: https://nextjs.org/docs/app/api-reference/components/image
 * - line-clamp: https://tailwindcss.com/docs/line-clamp
 */

"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ItemStatus } from "@/types";

/**
 * Props型
 */
interface ItemCardProps {
    /** 商品画像URL */
    imageUrl: string;
    /** 商品タイトル */
    title: string;
    /** 価格（円） */
    price: number;
    /** 商品の状態 */
    status: ItemStatus;
    /** 作成日時（ISO 8601形式） */
    createdAt: string;
    /** 追加のCSSクラス */
    className?: string;
    /** 編集モードフラグ（ドラッグ無効化用） */
    isEditMode?: boolean;
    /** 処理中フラグ（スケルトン表示用） */
    isProcessing?: boolean;
    /** クリック時のコールバック */
    onClick?: (e: React.MouseEvent) => void;
    /** Next.js Image Priority (LCP対策) */
    priority?: boolean;
}

/**
 * 商品カードコンポーネント
 *
 * Why isEditModeが必要か:
 * - 編集モード時は画像のドラッグを無効化
 * - 誤操作防止のためpointer-eventsを無効化
 *
 * @param props - コンポーネントのprops
 */
export function ItemCard({
    imageUrl,
    title,
    price,
    status,
    createdAt,
    className,
    isEditMode = false,
    isProcessing = false,
    onClick,
    priority = false,
}: ItemCardProps) {
    /**
     * 画像ロード完了フラグ
     * 
     * Why この仕組みが必要か:
     * - is_processingがfalseになっても、新しい画像はまだロード中の可能性がある
     * - ロード完了までシマーを維持し、元画像が一瞬表示されるのを防ぐ
     */
    const [imageLoaded, setImageLoaded] = useState(false);
    const prevImageUrlRef = useRef(imageUrl);

    // 画像URLが変わったらロード完了フラグをリセット
    useEffect(() => {
        if (imageUrl !== prevImageUrlRef.current) {
            setImageLoaded(false);
            prevImageUrlRef.current = imageUrl;
        }

    }, [imageUrl]);

    // 処理中が終わった直後で、画像がまだロードされていない場合はシマーを継続
    // 実際には: isProcessing中 または 画像変更後まだロードされていない場合
    // より簡潔に書くと:
    const showShimmer = isProcessing || !imageLoaded;

    /**
     * 日付フォーマット
     *
     * Why toLocaleDateStringを使うのか:
     * - ブラウザのロケール設定に基づいた表示
     * - 明示的に"ja-JP"を指定して日本語形式
     */
    const formattedDate = new Date(createdAt).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });

    return (
        <div
            className={cn(
                "bg-card rounded-xl border border-border/50 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group",
                isEditMode && "select-none",
                className
            )}
            onClick={onClick}
            draggable={false}
        >
            {/* 画像エリア + 価格オーバーレイ - ドラッグ可能 */}
            <div
                className="relative aspect-square bg-muted overflow-hidden"
                draggable={!isEditMode}
            >
                {/* 画像表示ロジック: エラー時や処理中は適切にハンドリング */}
                <Image
                    src={imageUrl}
                    alt={title}
                    fill
                    priority={priority}
                    className={`object-cover transition-opacity duration-300 ${isEditMode ? "select-none pointer-events-none" : ""
                        }`}
                    sizes="(max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    draggable={!isEditMode}
                    onLoad={() => setImageLoaded(true)}
                    onError={(e) => {
                        // エラー時は透明にして、背面のスケルトンやアイコンを表示させる
                        e.currentTarget.style.opacity = "0";
                        setImageLoaded(true); // エラー時もローディング終了扱い
                    }}
                />

                {/* 画像ロードエラー時・ロード中のフォールバック（背景） */}
                <div className="absolute inset-0 bg-muted -z-10 flex items-center justify-center text-muted-foreground">
                    <svg
                        className="w-12 h-12"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                    </svg>
                </div>

                {/* ホバー時の白オーバーレイ */}
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-25 transition-opacity duration-200 pointer-events-none" />

                {/* 処理中オーバーレイ（スケルトン風）- 画像ロード完了まで維持 */}
                {showShimmer && (
                    <div className="absolute inset-0 bg-white/60 z-30 flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                        {isProcessing && (
                            <span className="text-xs text-gray-600 font-medium bg-white/80 px-2 py-1 rounded-full z-10">
                                生成中...
                            </span>
                        )}
                    </div>
                )}

                {/* 価格バッジ - 0円または処理中/ロード中は非表示 */}
                {!showShimmer && price > 0 && (
                    <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 bg-black/70 text-white px-1.5 py-0.5 md:px-2 md:py-1 rounded text-[10px] md:text-sm font-bold z-10">
                        ¥{price.toLocaleString()}
                    </div>
                )}
            </div>

            {/* コンテンツエリア - ドラッグ不可、テキスト選択可能 */}
            <div className="p-2 md:p-3" draggable={false}>
                {/* タイトル（2行で切り詰め）- 処理中はスケルトン */}
                {isProcessing ? (
                    <div className="mb-2 space-y-1.5 hidden md:block">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
                    </div>
                ) : (
                    <h3
                        className={cn(
                            "text-sm font-medium text-card-foreground line-clamp-2 leading-tight mb-2 hidden md:block",
                            !isEditMode && "select-text cursor-text"
                        )}
                        onClick={(e) => {
                            // 通常モードではテキスト選択を許可するためイベント伝播を停止
                            if (!isEditMode) {
                                e.stopPropagation();
                            }
                        }}
                        draggable={false}
                    >
                        {title}
                    </h3>
                )}
                {/* メタ情報 */}
                <div className="flex flex-col items-start gap-0.5 md:flex-row md:items-center md:justify-between md:gap-2">
                    <span className="text-[9px] md:text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 md:px-2 rounded-full leading-none">
                        {status}
                    </span>
                    <span className="text-[9px] md:text-xs text-muted-foreground whitespace-nowrap leading-none pl-0.5">
                        {formattedDate}
                    </span>
                </div>
            </div>
        </div>
    );
}
