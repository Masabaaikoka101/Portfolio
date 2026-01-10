/**
 * 画像ギャラリープレビューコンポーネント
 *
 * このコンポーネントの役割:
 * - 複数画像のギャラリー形式プレビュー表示
 * - サムネイル一覧からのメイン画像切り替え
 * - レスポンシブ対応（モバイル: 上部サムネイル、PC: 左側サムネイル）
 *
 * 設計パターン:
 * - Controlled Component: 選択中のインデックスを親から受け取る
 * - モバイルファースト: 縦配置を基本に、PCで横配置
 */

"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface GalleryImage {
    id: string;
    url: string;
    isMain?: boolean;
}

interface ImageGalleryPreviewProps {
    /** 画像配列 */
    images: GalleryImage[];
    /** 追加のCSSクラス */
    className?: string;
    /** サムネイルクリック時のコールバック */
    onImageSelect?: (index: number) => void;
}

/**
 * 画像ギャラリープレビューコンポーネント
 */
export function ImageGalleryPreview({
    images,
    className,
    onImageSelect,
}: ImageGalleryPreviewProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    if (images.length === 0) {
        return null;
    }

    const currentImage = images[selectedIndex];

    const handleSelect = (index: number) => {
        setSelectedIndex(index);
        onImageSelect?.(index);
    };

    const handlePrev = () => {
        const newIndex = selectedIndex === 0 ? images.length - 1 : selectedIndex - 1;
        handleSelect(newIndex);
    };

    const handleNext = () => {
        const newIndex = selectedIndex === images.length - 1 ? 0 : selectedIndex + 1;
        handleSelect(newIndex);
    };

    // 単一画像の場合はシンプル表示
    if (images.length === 1) {
        return (
            <div className={cn("relative aspect-square w-full rounded-lg overflow-hidden bg-gray-100", className)}>
                <Image
                    src={currentImage.url}
                    alt="商品画像"
                    fill
                    className="object-contain"
                    unoptimized
                />
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col md:flex-row gap-3", className)}>
            {/* サムネイル一覧（モバイル: 上部横スクロール、PC: 左側縦配置） */}
            <div className="order-1 md:order-none md:w-20 flex-shrink-0">
                {/* モバイル: 横スクロール */}
                <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible md:overflow-y-auto md:max-h-[400px] pb-2 md:pb-0 md:pr-2 scrollbar-thin scrollbar-thumb-gray-300">
                    {images.map((image, index) => (
                        <button
                            key={image.id}
                            type="button"
                            onClick={() => handleSelect(index)}
                            className={cn(
                                "relative flex-shrink-0 w-16 h-16 md:w-full md:h-16 rounded-md overflow-hidden border-2 transition-all",
                                selectedIndex === index
                                    ? "border-blue-500 ring-2 ring-blue-200"
                                    : "border-gray-200 hover:border-gray-300"
                            )}
                        >
                            <Image
                                src={image.url}
                                alt={`サムネイル ${index + 1}`}
                                fill
                                className="object-cover"
                                unoptimized
                            />
                            {image.isMain && (
                                <div className="absolute bottom-0 left-0 right-0 bg-blue-500 text-white text-[10px] text-center py-0.5">
                                    メイン
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* メイン画像表示エリア */}
            <div className="flex-1 order-2 md:order-none">
                <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-gray-100">
                    <Image
                        src={currentImage.url}
                        alt={`商品画像 ${selectedIndex + 1}`}
                        fill
                        className="object-contain"
                        unoptimized
                    />

                    {/* 左右矢印ナビゲーション */}
                    <Button
                        variant="secondary"
                        size="icon"
                        onClick={handlePrev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 hover:bg-white shadow-md"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                        variant="secondary"
                        size="icon"
                        onClick={handleNext}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 hover:bg-white shadow-md"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </Button>

                    {/* 位置インジケータ */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                        {selectedIndex + 1} / {images.length}
                    </div>
                </div>
            </div>
        </div>
    );
}
