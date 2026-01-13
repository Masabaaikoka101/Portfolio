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
    /** クリック時のコールバック */
    onClick?: (e: React.MouseEvent) => void;
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
    onClick,
}: ItemCardProps) {
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
                "bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group",
                isEditMode && "select-none",
                className
            )}
            onClick={onClick}
            draggable={false}
        >
            {/* 画像エリア + 価格オーバーレイ - ドラッグ可能 */}
            <div
                className="relative aspect-square bg-gray-100 overflow-hidden"
                draggable={!isEditMode}
            >
                <Image
                    src={imageUrl}
                    alt={title}
                    fill
                    className={`object-cover ${isEditMode ? "select-none pointer-events-none" : ""}`}
                    /**
                     * Why sizesを指定するのか:
                     * - レスポンシブ画像の最適化
                     * - ビューポートに応じた適切なサイズの画像を読み込む
                     */
                    sizes="(max-width: 768px) 50vw, 25vw"
                    draggable={!isEditMode}
                />

                {/* ホバー時の白オーバーレイ */}
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-25 transition-opacity duration-200 pointer-events-none" />

                {/* 価格バッジ */}
                <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm font-bold z-10">
                    ¥{price.toLocaleString()}
                </div>
            </div>

            {/* コンテンツエリア - ドラッグ不可、テキスト選択可能 */}
            <div className="p-3" draggable={false}>
                {/* タイトル（2行で切り詰め） */}
                <h3
                    className={cn(
                        "text-sm font-medium text-gray-900 line-clamp-2 leading-tight mb-2",
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
                {/* メタ情報 */}
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full truncate">
                        {status}
                    </span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formattedDate}
                    </span>
                </div>
            </div>
        </div>
    );
}
