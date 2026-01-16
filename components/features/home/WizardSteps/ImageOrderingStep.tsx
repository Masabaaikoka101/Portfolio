/* eslint-disable react-hooks/set-state-in-effect */
/**
 * 画像並び替えステップコンポーネント
 *
 * dnd-kitを使用したシームレスなドラッグアンドドロップ
 */

"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ArrowRight, ArrowLeft, ImageIcon, Layers, Camera, Plus, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ListingMode } from "@/hooks/use-item-form";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MAX_FILES = 5;

interface ImageItem {
    id: string;
    src: string;
    originalIndex: number;
}

/**
 * ソート可能な画像コンポーネント（シームレスドラッグ）
 */
function SortableImage({
    item,
    displayIndex,
    isBatch,
    canDelete,
    onDelete
}: {
    item: ImageItem;
    displayIndex: number;
    isBatch: boolean;
    canDelete: boolean;
    onDelete: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "relative rounded-lg overflow-hidden border-2 bg-gray-50 group aspect-square cursor-grab active:cursor-grabbing touch-none",
                isDragging
                    ? "border-blue-500 shadow-2xl scale-105"
                    : "border-gray-200 hover:border-blue-400 hover:shadow-lg"
            )}
        >
            <img
                src={item.src}
                alt={`${displayIndex + 1}枚目`}
                className="w-full h-full object-cover pointer-events-none select-none"
                draggable={false}
            />

            <div className="absolute top-1 left-1 bg-gray-900/80 text-white text-[10px] px-1.5 py-0.5 rounded font-bold z-10 pointer-events-none">
                {isBatch ? `#${displayIndex + 1}` : (displayIndex === 0 ? "メイン" : `${displayIndex + 1}`)}
            </div>

            {canDelete && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onDelete();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute top-1 right-1 bg-white/90 hover:bg-red-100 text-gray-600 hover:text-red-600 rounded-full p-1 shadow-sm z-30 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="削除"
                >
                    <X className="w-3 h-3" />
                </button>
            )}

            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 pointer-events-none z-10">
                <GripVertical className="text-white drop-shadow-lg w-6 h-6" />
            </div>
        </div>
    );
}

interface ImageOrderingStepProps {
    originalImages: string[];
    reorderImages: (newIndices: number[]) => void;
    onAddImages?: (files: File[]) => void;
    onDeleteImage?: (index: number) => void;
    onNext: () => void;
    onBack: () => void;
    mode?: ListingMode;
}

export function ImageOrderingStep({
    originalImages,
    reorderImages,
    onAddImages,
    onDeleteImage,
    onNext,
    onBack,
    mode = "single",
}: ImageOrderingStepProps) {
    const isBatch = mode === "batch";
    const cameraAddRef = useRef<HTMLInputElement>(null);
    const albumAddRef = useRef<HTMLInputElement>(null);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const remainingSlots = MAX_FILES - originalImages.length;

    const [items, setItems] = useState<ImageItem[]>([]);

    useEffect(() => {
        setItems(originalImages.map((src, index) => ({
            id: `image-${index}`,
            src,
            originalIndex: index,
        })));

    }, [originalImages]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 3 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const newItems = arrayMove(items, oldIndex, newIndex);
        setItems(newItems);
        reorderImages(newItems.map(item => item.originalIndex));
    }, [items, reorderImages]);

    const handleAddFiles = useCallback((files: FileList | null) => {
        if (!files || files.length === 0) return;
        const fileArray = Array.from(files).filter(f => f.type.startsWith("image/"));
        if (fileArray.length === 0) return;

        const canAdd = Math.min(fileArray.length, remainingSlots);
        if (canAdd < fileArray.length) {
            toast.error(`最大${MAX_FILES}枚までです。${canAdd}枚追加しました。`);
        }
        if (canAdd > 0 && onAddImages) {
            onAddImages(fileArray.slice(0, canAdd));
        }
        setShowAddMenu(false);
    }, [remainingSlots, onAddImages]);

    const handleCameraClick = useCallback(() => {
        setShowAddMenu(false);
        cameraAddRef.current?.click();
    }, []);

    const handleAlbumClick = useCallback(() => {
        setShowAddMenu(false);
        albumAddRef.current?.click();
    }, []);

    const handleDelete = useCallback((displayIndex: number) => {
        if (!onDeleteImage) return;
        const item = items[displayIndex];
        if (item) onDeleteImage(item.originalIndex);
    }, [items, onDeleteImage]);

    return (
        <div className={cn(
            "mx-auto bg-white p-4 rounded-2xl shadow-sm border border-gray-100",
            isBatch ? "max-w-2xl" : "max-w-xl"
        )}>
            <input
                type="file"
                ref={cameraAddRef}
                onChange={(e) => handleAddFiles(e.target.files)}
                accept="image/*"
                capture="environment"
                className="hidden"
            />
            <input
                type="file"
                ref={albumAddRef}
                onChange={(e) => handleAddFiles(e.target.files)}
                accept="image/*"
                multiple
                className="hidden"
            />

            <div className="space-y-4">
                <div className="text-center">
                    <div className={cn(
                        "inline-flex items-center justify-center w-10 h-10 rounded-full mb-2",
                        isBatch ? "bg-[#EE6E13]/10 text-[#EE6E13]" : "bg-[#125DA7]/10 text-[#125DA7]"
                    )}>
                        {isBatch ? <Layers className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">
                        {isBatch ? "出品商品を確認" : "画像の順序を確認"}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        ドラッグして順番を入れ替えられます
                    </p>
                </div>

                {!isBatch && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-700">
                        1枚目の画像がAI生成の参照画像として使用されます
                    </div>
                )}

                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Label className="text-sm">
                            {isBatch ? `選択中: ${originalImages.length}点` : `画像の順序 (${originalImages.length}/${MAX_FILES})`}
                        </Label>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>合計5枚までしかアップロードできません。</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={items.map(item => item.id)}
                            strategy={rectSortingStrategy}
                        >
                            {/* レスポンシブグリッド: モバイル3列、デスクトップ5列 */}
                            <div className={cn(
                                "grid gap-2",
                                isBatch
                                    ? "grid-cols-4 md:grid-cols-5"
                                    : "grid-cols-3 md:grid-cols-5"
                            )}>
                                {items.map((item, displayIndex) => (
                                    <SortableImage
                                        key={item.id}
                                        item={item}
                                        displayIndex={displayIndex}
                                        isBatch={isBatch}
                                        canDelete={!!onDeleteImage && items.length > 1}
                                        onDelete={() => handleDelete(displayIndex)}
                                    />
                                ))}

                                {remainingSlots > 0 && (
                                    <div className="relative aspect-square">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddMenu(!showAddMenu)}
                                            className="w-full h-full rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 flex flex-col items-center justify-center text-gray-500 hover:text-blue-600 transition-all"
                                        >
                                            <Plus className="w-6 h-6 mb-0.5" />
                                            <span className="text-[10px] font-medium">追加</span>
                                        </button>

                                        {showAddMenu && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
                                                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[120px] overflow-hidden">
                                                    <button
                                                        type="button"
                                                        onClick={handleCameraClick}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                                                    >
                                                        <Camera className="w-4 h-4" />
                                                        カメラ
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleAlbumClick}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 border-t border-gray-100"
                                                    >
                                                        <ImageIcon className="w-4 h-4" />
                                                        アルバム
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                <div className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm z-10 border-t border-gray-100 -mx-4 -mb-4 p-4 mt-4 rounded-b-2xl">
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onBack} className="flex-1 py-5 text-gray-600">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            やり直す
                        </Button>
                        <Button
                            onClick={onNext}
                            className={cn(
                                "flex-1 py-5 text-white shadow-md",
                                isBatch ? "bg-[#EE6E13] hover:bg-[#D55C0C]" : "bg-[#125DA7] hover:bg-[#0E4B8A]"
                            )}
                        >
                            {isBatch ? "一括設定へ" : "次へ進む"}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
