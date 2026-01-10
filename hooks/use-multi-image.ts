/**
 * 複数画像管理フック
 *
 * このフックの役割:
 * - 複数画像のアップロード状態管理
 * - 画像の順序変更、追加、削除
 * - メイン画像の自動設定
 *
 * Why 別フックとして分離するのか:
 * - 複数画像のロジックは複雑で、単一責任の原則
 * - 既存のuse-image-uploadとの混在を避ける
 * - テスタビリティの向上
 */

"use client";

import { useState, useCallback } from "react";
import { ImagePreview } from "@/components/features/multi-image-uploader";

/**
 * 複数画像管理フック
 *
 * @returns 画像配列と各種操作関数
 */
export function useMultiImage() {
    const [images, setImages] = useState<ImagePreview[]>([]);

    /**
     * 画像配列の更新（外部から呼び出し用）
     */
    const handleImagesChange = useCallback((newImages: ImagePreview[]) => {
        setImages(newImages);
    }, []);

    /**
     * 画像の追加
     */
    const addImages = useCallback((files: File[]) => {
        const maxRemaining = 10 - images.length;
        const filesToAdd = files.slice(0, maxRemaining);

        const newImages: ImagePreview[] = [];

        filesToAdd.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const newImage: ImagePreview = {
                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    file,
                    preview: e.target?.result as string,
                    isMain: images.length === 0 && newImages.length === 0,
                };
                newImages.push(newImage);

                if (newImages.length === filesToAdd.length) {
                    setImages((prev) => [...prev, ...newImages]);
                }
            };
            reader.readAsDataURL(file);
        });
    }, [images.length]);

    /**
     * 画像の削除
     */
    const removeImage = useCallback((id: string) => {
        setImages((prev) => {
            const filtered = prev.filter((img) => img.id !== id);
            // メイン画像が削除された場合、最初の画像をメインに
            if (filtered.length > 0 && !filtered.some((img) => img.isMain)) {
                filtered[0].isMain = true;
            }
            return filtered;
        });
    }, []);

    /**
     * 画像の順序変更
     */
    const reorderImages = useCallback((fromIndex: number, toIndex: number) => {
        setImages((prev) => {
            const newImages = [...prev];
            const [removed] = newImages.splice(fromIndex, 1);
            newImages.splice(toIndex, 0, removed);

            // メイン画像の更新（最初の画像がメイン）
            return newImages.map((img, index) => ({
                ...img,
                isMain: index === 0,
            }));
        });
    }, []);

    /**
     * メイン画像の取得
     */
    const getMainImage = useCallback(() => {
        return images.find((img) => img.isMain) || images[0] || null;
    }, [images]);

    /**
     * 全画像のファイル配列を取得
     */
    const getFiles = useCallback(() => {
        return images.map((img) => img.file);
    }, [images]);

    /**
     * リセット
     */
    const reset = useCallback(() => {
        setImages([]);
    }, []);

    return {
        images,
        setImages: handleImagesChange,
        addImages,
        removeImage,
        reorderImages,
        getMainImage,
        getFiles,
        reset,
        hasImages: images.length > 0,
        imageCount: images.length,
    };
}
