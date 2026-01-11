/**
 * 複数画像アップローダーコンポーネント
 *
 * このコンポーネントの役割:
 * - 最大10枚の画像を選択・アップロード
 * - ドラッグ&ドロップで画像の順序変更
 * - 追加アップロード機能
 *
 * Why 既存のImageUploaderと別に作るのか:
 * - 単一画像と複数画像では状態管理が根本的に異なる
 * - ドラッグ&ドロップによる順序変更ロジックが追加される
 * - 既存コンポーネントの複雑化を避ける
 */

"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Upload, X, Plus, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MAX_IMAGES } from "@/lib/constants";

/** 画像プレビューデータ */
export interface ImagePreview {
    id: string;
    file: File;
    preview: string;
    isMain: boolean;
}

interface MultiImageUploaderProps {
    /** 選択中の画像プレビュー配列 */
    images: ImagePreview[];
    /** 画像変更時のコールバック */
    onImagesChange: (images: ImagePreview[]) => void;
    /** 追加のCSSクラス */
    className?: string;
}

/**
 * ソート可能なサムネイルアイテム
 */
function SortableThumbnail({
    image,
    index,
    onRemove,
}: {
    image: ImagePreview;
    index: number;
    onRemove: (id: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: image.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "relative group flex-shrink-0",
                isDragging && "opacity-50"
            )}
        >
            {/* サムネイル画像 */}
            <div
                className={cn(
                    "relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all",
                    image.isMain
                        ? "border-blue-500 ring-2 ring-blue-200"
                        : "border-gray-200 hover:border-gray-300"
                )}
            >
                <Image
                    src={image.preview}
                    alt={`Image ${index + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                />

                {/* メインバッジ */}
                {image.isMain && (
                    <div className="absolute top-0 left-0 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-br-md font-medium">
                        メイン
                    </div>
                )}

                {/* ドラッグハンドル */}
                <div
                    {...attributes}
                    {...listeners}
                    className="absolute inset-0 cursor-grab active:cursor-grabbing flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors"
                >
                    <GripVertical className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                </div>

                {/* 削除ボタン */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(image.id);
                    }}
                    className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                >
                    <X className="h-3 w-3" />
                </button>
            </div>

            {/* 番号 */}
            <div className="text-center text-xs text-gray-500 mt-1">
                {index + 1}
            </div>
        </div>
    );
}

/**
 * 複数画像アップローダーコンポーネント
 */
export function MultiImageUploader({
    images,
    onImagesChange,
    className,
}: MultiImageUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ドラッグ&ドロップセンサー設定
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // 感度向上（8→5）
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 150,  // 長押しで発動（モバイル対応）
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    /**
     * ファイルを処理して画像プレビューを作成
     */
    const processFiles = useCallback(
        (files: FileList | File[]) => {
            const fileArray = Array.from(files);
            const imageFiles = fileArray.filter((file) => file.type.startsWith("image/"));
            const remainingSlots = MAX_IMAGES - images.length;

            // 枚数超過の通知
            if (imageFiles.length > remainingSlots) {
                const skippedCount = imageFiles.length - remainingSlots;
                toast.info(`最大${MAX_IMAGES}枚までです（${skippedCount}枚は選択されませんでした）`);
            }

            if (remainingSlots <= 0) {
                toast.warning(`これ以上追加できません（最大${MAX_IMAGES}枚）`);
                return;
            }

            const filesToProcess = imageFiles.slice(0, remainingSlots);

            const newImages: ImagePreview[] = [];

            filesToProcess.forEach((file) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const newImage: ImagePreview = {
                        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        file,
                        preview: e.target?.result as string,
                        isMain: images.length === 0 && newImages.length === 0,
                    };
                    newImages.push(newImage);

                    // 全ファイルの読み込み完了後に更新
                    if (newImages.length === filesToProcess.length) {
                        onImagesChange([...images, ...newImages]);
                    }
                };
                reader.readAsDataURL(file);
            });
        },
        [images, onImagesChange]
    );

    /**
     * ドラッグ終了時の順序変更処理
     */
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = images.findIndex((img) => img.id === active.id);
            const newIndex = images.findIndex((img) => img.id === over.id);

            const newImages = arrayMove(images, oldIndex, newIndex);

            // メイン画像の更新（最初の画像がメイン）
            const updatedImages = newImages.map((img, index) => ({
                ...img,
                isMain: index === 0,
            }));

            onImagesChange(updatedImages);
        }
    };

    /**
     * 画像削除
     */
    const handleRemove = (id: string) => {
        const newImages = images.filter((img) => img.id !== id);

        // メイン画像の再設定
        if (newImages.length > 0 && !newImages.some((img) => img.isMain)) {
            newImages[0].isMain = true;
        }

        onImagesChange(newImages);
    };

    // ドロップゾーンイベント
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
        if (e.dataTransfer.files?.length) {
            processFiles(e.dataTransfer.files);
        }
    };

    const onClickUpload = () => {
        fileInputRef.current?.click();
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            processFiles(e.target.files);
            // 同じファイルを再選択可能にするためリセット
            e.target.value = "";
        }
    };

    const canAddMore = images.length < MAX_IMAGES;

    return (
        <div className={cn("space-y-4", className)}>
            {/* 隠しファイル入力 */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                accept="image/*"
                multiple
                className="hidden"
            />

            {images.length === 0 ? (
                // 初期状態：アップロードエリア
                <Card
                    className={cn(
                        "relative w-full overflow-hidden transition-all duration-300 ease-in-out border-dashed cursor-pointer",
                        isDragging
                            ? "border-blue-500 bg-blue-50 border-2"
                            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50 border-2"
                    )}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={onClickUpload}
                >
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="mb-4 rounded-full bg-gray-100 p-4">
                            <Upload className="h-8 w-8 text-gray-500" />
                        </div>
                        <h3 className="mb-1 text-lg font-semibold text-gray-900">
                            写真をアップロード
                        </h3>
                        <p className="text-sm text-gray-500">
                            ここにドラッグ＆ドロップ、またはクリックして選択
                        </p>
                        <p className="mt-2 text-xs text-gray-400">
                            PNG, JPG, WEBP (最大10枚)
                        </p>
                    </div>
                </Card>
            ) : (
                // 画像選択済み：サムネイル一覧
                <div className="space-y-4">
                    {/* サムネイル一覧（横スクロール） */}
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={images.map((img) => img.id)}
                            strategy={horizontalListSortingStrategy}
                        >
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
                                {images.map((image, index) => (
                                    <SortableThumbnail
                                        key={image.id}
                                        image={image}
                                        index={index}
                                        onRemove={handleRemove}
                                    />
                                ))}

                                {/* 追加ボタン */}
                                {canAddMore && (
                                    <button
                                        type="button"
                                        onClick={onClickUpload}
                                        className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 flex items-center justify-center transition-colors"
                                    >
                                        <Plus className="h-6 w-6 text-gray-400" />
                                    </button>
                                )}
                            </div>
                        </SortableContext>
                    </DndContext>

                    {/* 残り枚数表示 */}
                    <p className="text-xs text-gray-500 text-center">
                        {images.length} / {MAX_IMAGES} 枚
                        {images.length > 0 && "（ドラッグで順番を変更）"}
                    </p>
                </div>
            )}
        </div>
    );
}
