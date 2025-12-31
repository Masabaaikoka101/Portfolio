"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
    onImageSelect: (file: File) => void;
    className?: string;
}

export function ImageUploader({ onImageSelect, className }: ImageUploaderProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = (file: File) => {
        if (!file.type.startsWith("image/")) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            setPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        onImageSelect(file);
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
        if (e.dataTransfer.files?.[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const onClickUpload = () => {
        fileInputRef.current?.click();
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const clearImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <Card
            className={cn(
                "relative w-full overflow-hidden transition-all duration-300 ease-in-out border-dashed",
                isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50",
                preview ? "border-solid border-gray-200" : "border-2",
                className
            )}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={!preview ? onClickUpload : undefined}
        >
            <input
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                accept="image/*"
                className="hidden"
            />

            {preview ? (
                <div className="relative aspect-square w-full md:aspect-[4/3]">
                    <Image
                        src={preview}
                        alt="Uploaded image"
                        fill
                        className="object-contain"
                    />
                    <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-2 h-8 w-8 rounded-full shadow-md hover:bg-red-100 hover:text-red-600"
                        onClick={clearImage}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
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
                        PNG, JPG, WEBP (最大 10MB)
                    </p>
                </div>
            )}
        </Card>
    );
}
