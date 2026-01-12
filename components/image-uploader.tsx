/**
 * 画像アップローダーコンポーネント
 *
 * このコンポーネントの役割:
 * - ドラッグ＆ドロップまたはクリックで画像をアップロード
 * - 選択した画像のプレビュー表示
 * - 画像のクリア機能
 *
 * Why コンポーネントとして分離するのか:
 * - 画像アップロードUIは再利用性が高い
 * - ドラッグ＆ドロップのロジックをカプセル化
 * - EmptyState等、複数の場所から呼び出し可能
 *
 * 設計パターン:
 * - Controlled Component風: onImageSelect で親に通知
 * - 内部状態（preview）は表示のみに使用
 *
 * Learning:
 * - Drag and Drop API: https://developer.mozilla.org/ja/docs/Web/API/HTML_Drag_and_Drop_API
 * - FileReader API: https://developer.mozilla.org/ja/docs/Web/API/FileReader
 * - next/image: https://nextjs.org/docs/app/api-reference/components/image
 */

"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Props型
 */
interface ImageUploaderProps {
    /** 画像選択時のコールバック（複数） */
    onFilesSelect: (files: File[]) => void;
    /** 追加のCSSクラス */
    className?: string;
}

/**
 * 画像アップローダーコンポーネント
 */
export function ImageUploader({ onFilesSelect, className }: ImageUploaderProps) {
    /** プレビュー画像リスト */
    const [previews, setPreviews] = useState<string[]>([]);
    /** ドラッグ中フラグ */
    const [isDragging, setIsDragging] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    /**
     * ファイル処理
     */
    const handleFiles = (files: File[]) => {
        const validFiles = files.filter(f => f.type.startsWith("image/")).slice(0, 3);
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

    const onClickUpload = () => {
        fileInputRef.current?.click();
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            handleFiles(Array.from(e.target.files));
        }
    };

    const clearImages = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPreviews([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
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
            onClick={previews.length === 0 ? onClickUpload : undefined}
        >
            {/* 隠しファイル入力 */}
            <input
                type="file"
                ref={fileInputRef}
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
                                previews.length === 3 && index === 0 && "col-span-2"
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
                // アップロード待ち状態
                <div className="flex flex-col items-center justify-center py-16 text-center cursor-pointer">
                    <div className="mb-4 rounded-full bg-gray-100 p-4 transition-colors group-hover:bg-gray-200">
                        <Upload className="h-8 w-8 text-gray-500" />
                    </div>
                    <h3 className="mb-1 text-lg font-semibold text-gray-900">
                        写真をアップロード
                    </h3>
                    <p className="text-sm text-gray-500">
                        ここにドラッグ＆ドロップ、またはクリックして選択
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                        最大3枚まで (PNG, JPG, WEBP)
                    </p>
                </div>
            )}
        </Card>
    );
}
