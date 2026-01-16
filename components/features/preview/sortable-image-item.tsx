/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableImageItemProps {
    id: string;
    index: number;
    imageSrc: string | null | undefined;
    isActive: boolean;
    isLoading: boolean;
    isMain: boolean;
    canDelete: boolean;
    canDrag: boolean;
    onClick: () => void;
    onDelete?: () => void;
}

/**
 * ドラッグ可能な画像サムネイルアイテム
 */
export function SortableImageItem({
    id,
    index,
    imageSrc,
    isActive,
    isLoading,
    isMain,
    canDelete,
    canDrag,
    onClick,
    onDelete,
}: SortableImageItemProps) {
    // 画像ロード完了状態を管理（チラつき防止）
    const [imageLoaded, setImageLoaded] = useState(false);
    const prevImageSrcRef = useRef(imageSrc);

    // 画像URLが変更されたらロード状態をリセット
    useEffect(() => {
        if (imageSrc !== prevImageSrcRef.current) {
            setImageLoaded(false);
            prevImageSrcRef.current = imageSrc;
        }

    }, [imageSrc]);

    // ローディング表示: isLoadingがtrue、または画像がまだロードされていない
    const showLoading = isLoading || (imageSrc && !imageLoaded);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, disabled: !canDrag });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : "auto",
        opacity: isDragging ? 0.5 : 1,
    };

    // クリックとドラッグを区別するためのハンドラ
    const handleClick = (e: React.MouseEvent) => {
        // ドラッグ中はクリックを無視
        if (isDragging) {
            e.preventDefault();
            return;
        }
        onClick();
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="relative w-[calc(25%-6px)] md:w-full aspect-square touch-none"
        >
            <div
                {...(canDrag ? { ...attributes, ...listeners } : {})}
                onClick={handleClick}
                className={cn(
                    "relative w-full h-full rounded-md overflow-hidden border-2 transition-all group bg-gray-50",
                    canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                    isActive
                        ? "border-blue-500 ring-2 ring-blue-100"
                        : "border-gray-200 hover:border-gray-300",
                    isDragging && "ring-4 ring-blue-300 shadow-lg"
                )}
            >
                {imageSrc && (
                    <Image
                        src={imageSrc}
                        alt={`Image ${index + 1}`}
                        fill
                        className="object-cover pointer-events-none select-none"
                        unoptimized
                        draggable={false}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageLoaded(true)}
                    />
                )}

                {/* メイン画像ラベル */}
                {isMain && (
                    <div className="absolute top-0 left-0 bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded-br-md z-10 shadow-sm pointer-events-none backdrop-blur-[2px]">
                        メイン
                    </div>
                )}

                {/* 処理中オーバーレイ（画像ロード完了まで表示） */}
                {showLoading && (
                    <div className="absolute inset-0 bg-white/60 animate-pulse flex items-center justify-center">
                        <span className="text-xs text-gray-700 font-medium">
                            {isLoading ? "処理中" : "読込中"}
                        </span>
                    </div>
                )}

                {/* 削除ボタン */}
                {canDelete && onDelete && (
                    <button
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-red-600 z-20"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onDelete();
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        title="画像を削除"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}
