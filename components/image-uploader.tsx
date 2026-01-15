/**
 * 画像アップローダーコンポーネント
 *
 * このコンポーネントの役割:
 * - カメラ撮影またはアルバムから画像をアップロード
 * - ドラッグ＆ドロップでの画像アップロード
 * - 選択した画像のプレビュー表示
 * - 画像のクリア機能
 */

"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Camera, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Props型
 */
interface ImageUploaderProps {
    /** 画像選択時のコールバック（複数） */
    onFilesSelect: (files: File[]) => void;
    /** 追加のCSSクラス */
    className?: string;
    /** 最大アップロード枚数 (デフォルト: 5) */
    maxFiles?: number;
}

/**
 * 画像アップローダーコンポーネント
 */
export function ImageUploader({ onFilesSelect, className, maxFiles = 5 }: ImageUploaderProps) {
    /** プレビュー画像リスト */
    const [previews, setPreviews] = useState<string[]>([]);
    /** ドラッグ中フラグ */
    const [isDragging, setIsDragging] = useState(false);

    const cameraInputRef = useRef<HTMLInputElement>(null);
    const albumInputRef = useRef<HTMLInputElement>(null);

    /**
     * ファイル処理
     */
    const handleFiles = (files: File[]) => {
        // 画像のみフィルタリング
        const imageFiles = files.filter(f => f.type.startsWith("image/"));

        // 枚数制限チェック
        if (imageFiles.length > maxFiles) {
            toast.error(`${maxFiles}枚までしかアップロードできません`);
        }

        const validFiles = imageFiles.slice(0, maxFiles);
        if (validFiles.length === 0) return;

        // プレビュー生成（UI用）
        const newPreviews: string[] = [];
        const promises = validFiles.map(file => new Promise<void>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                newPreviews.push(e.target?.result as string);
                resolve();
            };
            reader.readAsDataURL(file);
        }));

        Promise.all(promises).then(() => {
            setPreviews(newPreviews);
            onFilesSelect(validFiles);
        });
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.length > 0) {
            handleFiles(Array.from(e.dataTransfer.files));
        }
    };

    const onCameraClick = () => {
        cameraInputRef.current?.click();
    };

    const onAlbumClick = () => {
        albumInputRef.current?.click();
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            handleFiles(Array.from(e.target.files));
        }
    };

    const clearImages = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPreviews([]);
        if (cameraInputRef.current) {
            cameraInputRef.current.value = "";
        }
        if (albumInputRef.current) {
            albumInputRef.current.value = "";
        }
    };

    return (
        <Card
            className={cn(
                "relative w-full overflow-hidden transition-all duration-300 ease-in-out border-dashed",
                isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50",
                previews.length > 0 ? "border-solid border-gray-200" : "border-2",
                className
            )}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            {/* 隠しファイル入力（カメラ用） */}
            <input
                type="file"
                ref={cameraInputRef}
                onChange={onFileChange}
                accept="image/*"
                capture="environment"
                className="hidden"
            />
            {/* 隠しファイル入力（アルバム用・複数選択可） */}
            <input
                type="file"
                ref={albumInputRef}
                onChange={onFileChange}
                accept="image/*"
                className="hidden"
                multiple
            />

            {previews.length > 0 ? (
                // プレビュー表示状態
                <div className="relative w-full h-full p-4">
                    <div className="grid grid-cols-2 gap-2 w-full h-full">
                        {previews.map((src, index) => (
                            <div key={index} className={cn(
                                "relative aspect-square w-full rounded-md overflow-hidden bg-gray-100",
                                previews.length === 1 && "col-span-2 row-span-2 aspect-auto h-64 md:h-80",
                                previews.length === 3 && index === 0 && "col-span-2",
                                previews.length >= 4 && "col-span-1 row-span-1"
                            )}>
                                <Image
                                    src={src}
                                    alt={`Uploaded image ${index + 1}`}
                                    fill
                                    className="object-contain"
                                    unoptimized
                                />
                            </div>
                        ))}
                    </div>
                    <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-2 h-8 w-8 rounded-full shadow-md hover:bg-red-100 hover:text-red-600 z-10"
                        onClick={clearImages}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                // アップロード待ち状態（カメラ/アルバム2ボタン）
                <div className="flex flex-col items-center justify-center py-8 md:py-12 text-center">
                    <h3 className="mb-4 text-lg font-semibold text-gray-900">
                        写真をアップロード
                    </h3>

                    {/* カメラ/アルバムボタン */}
                    <div className="flex gap-4 mb-4">
                        <button
                            type="button"
                            onClick={onCameraClick}
                            className="flex flex-col items-center justify-center w-28 h-24 rounded-xl border-2 border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 group"
                        >
                            <Camera className="w-8 h-8 text-gray-500 group-hover:text-blue-600 mb-1" />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">カメラ</span>
                        </button>
                        <button
                            type="button"
                            onClick={onAlbumClick}
                            className="flex flex-col items-center justify-center w-28 h-24 rounded-xl border-2 border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 group"
                        >
                            <ImageIcon className="w-8 h-8 text-gray-500 group-hover:text-blue-600 mb-1" />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">アルバム</span>
                        </button>
                    </div>

                    <p className="text-sm text-gray-500">
                        またはここにドラッグ＆ドロップ
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                        最大{maxFiles}枚まで (PNG, JPG, WEBP)
                    </p>
                </div>
            )}
        </Card>
    );
}
