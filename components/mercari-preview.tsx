import { Camera, Copy, Check, Download, Edit2, Sparkles, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ComparisonSlider } from "@/components/comparison-slider";
import { Label } from "@/components/ui/label";
import { useMercariPreview } from "@/components/features/preview/use-mercari-preview";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ItemStatus } from "@/types";
import { STATUS_OPTIONS } from "@/lib/constants";
import Image from "next/image";
import { Reorder } from "framer-motion";


/**
 * Props型
 */
interface MercariPreviewProps {
    // --- 既存 Props (互換性維持) ---
    image?: string;
    originalImage?: string;

    // --- 新規 Props (複数画像 & Loading) ---
    /** 処理済み画像リスト（表示優先） */
    images?: (string | null)[];
    /** オリジナル画像リスト */
    originalImages?: string[];
    /** 各画像の処理中ステータス */
    loadingStates?: boolean[];
    /** テキスト分析中フラグ */
    isAnalyzing?: boolean;
    /** 現在選択中の画像インデックス */
    selectedIndex?: number;
    /** 画像選択コールバック */
    onImageSelect?: (index: number) => void;
    /** 表示モード (デフォルト: "single") */
    /** 表示モード (デフォルト: "single") */
    mode?: "single" | "batch";
    /** 並び替えコールバック */
    onReorder?: (newOrderIndices: number[]) => void;
    /** 画像追加コールバック */
    onAddImage?: (files: File[]) => void;
    /** 画像削除コールバック */
    onDeleteImage?: (index: number) => void;

    // --- 共通 Props ---
    title: string;
    description: string;
    price: number;
    status?: ItemStatus;
    className?: string;
    onSave?: () => void;
    isSaving?: boolean;
    editable?: boolean;
    onTitleChange?: (value: string) => void;
    onDescriptionChange?: (value: string) => void;
    onPriceChange?: (value: number) => void;
    onStatusChange?: (value: ItemStatus) => void;
    onEditImage?: () => void;
}

/**
 * メルカリ出品プレビューコンポーネント
 */
export function MercariPreview({
    image,
    originalImage,
    images: propImages,
    originalImages: propOriginalImages,
    loadingStates,
    isAnalyzing = false,
    selectedIndex = 0,
    onImageSelect,
    mode = "single",
    title,
    description,
    price,
    status,
    className,
    onSave,
    isSaving = false,
    editable = false,
    onTitleChange,
    onDescriptionChange,
    onPriceChange,
    onStatusChange,
    onEditImage,
    onReorder,
    onAddImage,
    onDeleteImage,
}: MercariPreviewProps) {

    const { copiedField, handleCopy, handleDownload } = useMercariPreview();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 互換性対応: 配列がない場合は単体propを使用
    const images = React.useMemo(() =>
        propImages ?? (image ? [image] : []),
        [propImages, image]);

    const originalImages = React.useMemo(() =>
        propOriginalImages ?? (originalImage ? [originalImage] : []),
        [propOriginalImages, originalImage]);

    // 表示用データの解決
    const currentProcessed = images[selectedIndex] ?? null; // nullなら処理中または未生成
    const currentOriginal = originalImages[selectedIndex];

    // 表示すべき画像: 処理済みがあればそれ、なければオリジナル
    const displayImage = currentProcessed ?? currentOriginal;

    // ローディング状態: 指定があればそれ、なければ analyze中なら全体的に... (画像個別のloadingStatesがあればそちら優先)
    const isImageLoading = loadingStates?.[selectedIndex] ?? (isAnalyzing || false);

    // スロット表示が必要か（複数画像がある場合 かつ 単体モード）
    // バッチモードの場合は、個別の商品として扱うためサムネイルリストは非表示にする
    // 修正: 画像追加機能がある場合は、1枚でも追加ボタンを表示するためにリストを表示する
    const showThumbnails = mode === "single" && (originalImages.length > 1 || !!onAddImage);

    // テキストローディング（スケルトン）表示用
    const TextSkeleton = ({ className }: { className?: string }) => (
        <div className={cn("animate-pulse bg-gray-300 rounded", className)} />
    );

    // キーボードナビゲーション
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 入力中などでなければ矢印キーで移動
            if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) return;

            if (e.key === "ArrowLeft") {
                onImageSelect?.((selectedIndex - 1 + images.length) % images.length);
            } else if (e.key === "ArrowRight") {
                onImageSelect?.((selectedIndex + 1) % images.length);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedIndex, images.length, onImageSelect]);

    // DnD用のローカルステート（インデックスの配列）
    const [orderedIndices, setOrderedIndices] = React.useState<number[]>([]);

    // propsのoriginalImagesが変更されたら、インデックスをリセット
    useEffect(() => {
        // console.log("MercariPreview: originalImages changed, resetting orderedIndices", originalImages);
        setOrderedIndices(originalImages.map((_, i) => i));
    }, [originalImages]);

    return (
        <div
            className={cn(
                "w-full bg-transparent", // 外枠削除、背景透明
                className
            )}
        >
            {/* Desktop: 画像優先レイアウト (約6.5:3.5), Mobile: 縦積み */}
            <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-4 lg:gap-4 items-start">
                {/* 画像エリア - 独立したカード化 */}
                <div className="relative bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col gap-6 min-h-[400px] lg:min-h-[600px] p-4 lg:p-6 overflow-hidden lg:sticky lg:top-24 self-start">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-gray-600">
                            {mode === "batch" ? "出品アイテム (選択中)" : "商品画像"}
                        </Label>
                        <div className="flex gap-2">
                            {displayImage && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-gray-500 hover:text-blue-600"
                                    onClick={() => handleDownload(displayImage, title)}
                                >
                                    <Download className="h-4 w-4 mr-1" />
                                    <span className="text-xs">DL</span>
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* 画像とサムネイルのラッパー */}
                    <div className="flex flex-col md:flex-row gap-3 flex-1">
                        {/* サムネイルリスト (Mobile:上 / Desktop:左) */}
                        {/* Batchモードでも表示するように条件を変更 */}
                        {(showThumbnails || mode === "batch") && (
                            <div className="order-1 flex flex-col gap-2 w-full md:w-20 md:shrink-0">
                                <Reorder.Group
                                    axis="y"
                                    values={orderedIndices}
                                    onReorder={setOrderedIndices}
                                    className="grid grid-cols-4 md:grid-cols-1 gap-2"
                                >
                                    {orderedIndices.map((originalIndex) => {
                                        // console.log("Rendering slot:", { originalIndex, selectedIndex, isActive: originalIndex === selectedIndex });
                                        const orig = originalImages[originalIndex];
                                        const processed = images[originalIndex];
                                        const isThisLoading = loadingStates?.[originalIndex] ?? false;
                                        const thumbSrc = processed ?? orig;
                                        const isActive = originalIndex === selectedIndex;

                                        // keyには一意なURLを使用し、リレンダリング時にコンポーネントが破棄されないようにする
                                        // (インデックスをkeyにすると、並び替えでコンポーネントの中身が入れ替わる扱いになり、アニメーションが壊れる)
                                        const itemKey = thumbSrc || `index-${originalIndex}`;

                                        return (
                                            <Reorder.Item
                                                key={itemKey}
                                                value={originalIndex}
                                                // ドラッグ可能かどうかは onReorder があるかどうかで判定 (Read-Only時は無効)
                                                drag={!!onReorder}
                                                onDragEnd={() => onReorder?.(orderedIndices)}
                                                className="relative w-full aspect-square"
                                            >
                                                <div
                                                    onClick={() => onImageSelect?.(originalIndex)}
                                                    className={cn(
                                                        "relative w-full h-full rounded-md overflow-hidden border-2 transition-all cursor-pointer group",
                                                        isActive ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200 hover:border-gray-300"
                                                    )}
                                                >
                                                    {thumbSrc && (
                                                        <Image
                                                            src={thumbSrc}
                                                            alt={`Slot ${originalIndex}`}
                                                            fill
                                                            className="object-cover pointer-events-none" // pointer-events-none for drag handle
                                                            unoptimized
                                                        />
                                                    )}
                                                    {isThisLoading && (
                                                        <div className="absolute inset-0 bg-white/60 animate-pulse flex items-center justify-center">
                                                            <span className="text-xs text-white font-medium drop-shadow-md">生成中</span>
                                                        </div>
                                                    )}

                                                    {/* 削除ボタン */}
                                                    {onDeleteImage && images.length > 1 && (
                                                        <button
                                                            className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // オリジナルインデックスを削除
                                                                onDeleteImage(originalIndex);
                                                            }}
                                                            title="画像を削除"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </Reorder.Item>
                                        );
                                    })}
                                </Reorder.Group>

                                {/* 画像追加ボタン (最大5枚まで) */}
                                {onAddImage && (
                                    images.length < 5 ? (
                                        <div className="flex flex-col gap-1 w-1/4 md:w-full">
                                            <div className="w-full aspect-square border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-colors"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <Plus className="h-6 w-6 text-gray-400 mb-1" />
                                                <span className="text-[10px] text-gray-400 font-medium">追加</span>
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    className="hidden"
                                                    multiple
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files.length > 0) {
                                                            onAddImage(Array.from(e.target.files));
                                                            e.target.value = "";
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <span className="text-[10px] text-gray-400 text-center">合計5枚まで</span>
                                        </div>
                                    ) : null
                                )}
                            </div>
                        )}

                        {/* メイン画像表示エリア */}
                        <div className="order-2 flex-1 relative w-full aspect-square rounded-lg overflow-hidden bg-gray-50 group border border-gray-100">
                            {displayImage && currentOriginal && currentProcessed ? (
                                // 処理済み＆オリジナルあり -> 比較スライダー
                                <ComparisonSlider
                                    imageBefore={currentOriginal}
                                    imageAfter={currentProcessed}
                                    className="w-full h-full border-0 rounded-none shadow-none"
                                />
                            ) : displayImage ? (
                                // 単一画像表示（オリジナルのみ、または処理済みのみ）
                                <>
                                    <Image
                                        src={displayImage}
                                        alt="Item"
                                        fill
                                        className="object-contain"
                                        unoptimized
                                    />
                                    {editable && onEditImage && !isImageLoading && (
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer z-10" onClick={onEditImage}>
                                            <Button variant="secondary" size="sm" className="pointer-events-none">
                                                <Edit2 className="h-4 w-4 mr-2" />
                                                画像を編集
                                            </Button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                // プレースホルダー
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <Camera className="h-12 w-12" />
                                </div>
                            )}

                            {/* メイン画像のシマーエフェクト (読み込み中) */}
                            {isImageLoading && (
                                <div className="absolute inset-0 bg-white/60 animate-pulse z-20 flex items-center justify-center">
                                    <span className="text-sm text-white font-medium drop-shadow-lg">生成中...</span>
                                </div>
                            )}

                            {/* ナビゲーション矢印 (複数画像がある場合) */}
                            {images.length > 1 && (
                                <>
                                    {/* 左矢印: 最初の画像でない場合のみ表示 */}
                                    {selectedIndex > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 shadow-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-30 disabled:opacity-0 w-8 h-8"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onImageSelect?.(selectedIndex - 1);
                                            }}
                                            disabled={isImageLoading}
                                        >
                                            <ChevronLeft className="h-5 w-5" />
                                        </Button>
                                    )}

                                    {/* 右矢印: 最後の画像でない場合のみ表示 */}
                                    {selectedIndex < images.length - 1 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 shadow-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-30 disabled:opacity-0 w-8 h-8"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onImageSelect?.(selectedIndex + 1);
                                            }}
                                            disabled={isImageLoading}
                                        >
                                            <ChevronRight className="h-5 w-5" />
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* 右側: コンテンツエリア - 独立したカード化 */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 lg:p-6 flex flex-col h-fit">
                    {/* タイトルセクション */}
                    <div className="mb-4">
                        <Label className="text-sm font-medium text-gray-600 mb-2 block">
                            商品名
                        </Label>
                        <div className="relative">
                            {isAnalyzing ? (
                                <TextSkeleton className="h-10 flex-1" />
                            ) : editable ? (
                                <>
                                    <Input
                                        value={title}
                                        onChange={(e) => onTitleChange?.(e.target.value)}
                                        className="text-lg font-bold border-gray-300 focus:border-blue-500 pr-10"
                                        placeholder="商品名を入力"
                                        maxLength={40}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-transparent"
                                        onClick={() => handleCopy(title, "title")}
                                        title="商品名をコピー"
                                    >
                                        {copiedField === "title" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </>
                            ) : (
                                <div className="flex items-center justify-between gap-2">
                                    <h2 className="text-lg lg:text-xl font-bold text-gray-900 leading-tight">
                                        {title || "商品名がここに入ります"}
                                    </h2>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0 h-8 w-8 text-gray-400 hover:text-blue-600"
                                        onClick={() => handleCopy(title, "title")}
                                        title="商品名をコピー"
                                    >
                                        {copiedField === "title" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 商品の状態セクション */}
                    <div className="mb-4">
                        <Label className="text-sm font-medium text-gray-600 mb-2 block">
                            商品の状態
                        </Label>
                        {isAnalyzing ? (
                            <TextSkeleton className="h-10 w-full" />
                        ) : editable ? (
                            <Select
                                value={status}
                                onValueChange={(value) => onStatusChange?.(value as ItemStatus)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="状態を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="text-sm text-gray-900 bg-gray-100 px-3 py-1.5 rounded inline-block">
                                {status || "未設定"}
                            </div>
                        )}
                    </div>

                    {/* 価格セクション */}
                    <div className="mb-4">
                        <Label className="text-sm font-medium text-gray-600 mb-2 block">
                            販売価格
                        </Label>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-gray-900">¥</span>
                            <div className="relative">
                                {isAnalyzing ? (
                                    <TextSkeleton className="h-10 w-40" />
                                ) : editable ? (
                                    <>
                                        <Input
                                            type="number"
                                            value={price}
                                            onChange={(e) => onPriceChange?.(parseInt(e.target.value) || 0)}
                                            className="text-2xl font-bold text-gray-900 w-40 border-gray-300 focus:border-blue-500 pr-10"
                                            min={0}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-transparent"
                                            onClick={() => handleCopy(price.toString(), "price")}
                                            title="価格をコピー"
                                        >
                                            {copiedField === "price" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl lg:text-3xl font-bold text-gray-900">
                                            {price.toLocaleString()}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="shrink-0 h-8 w-8 text-gray-400 hover:text-blue-600"
                                            onClick={() => handleCopy(price.toString(), "price")}
                                            title="価格をコピー"
                                        >
                                            {copiedField === "price" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 説明文セクション */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium text-gray-600">
                                商品説明
                            </Label>
                        </div>
                        <div className="relative">
                            {isAnalyzing ? (
                                <div className="space-y-2">
                                    <TextSkeleton className="h-4 w-full" />
                                    <TextSkeleton className="h-4 w-5/6" />
                                    <TextSkeleton className="h-4 w-4/6" />
                                    <TextSkeleton className="h-20 w-full mt-4" />
                                </div>
                            ) : editable ? (
                                <>
                                    <Textarea
                                        value={description}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onDescriptionChange?.(e.target.value)}
                                        className="w-full min-h-[400px] text-sm border-gray-300 focus:border-blue-500 resize-y p-3 pr-10 leading-relaxed"
                                        placeholder="商品説明を入力"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-2 top-2 h-8 w-8 text-gray-400 hover:text-blue-600 bg-white/50 hover:bg-white border shadow-sm rounded-md"
                                        onClick={() => handleCopy(description, "description")}
                                        title="商品説明をコピー"
                                    >
                                        {copiedField === "description" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </>
                            ) : (
                                <div className="relative group">
                                    <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed p-4 bg-gray-50 rounded border border-gray-100 min-h-[200px]">
                                        {description || "ここにAI生成された商品説明文が表示されます。"}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-2 top-2 h-8 w-8 text-gray-400 hover:text-blue-600 bg-white/80 border shadow-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleCopy(description, "description")}
                                        title="商品説明をコピー"
                                    >
                                        {copiedField === "description" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 保存ボタン */}
                    {onSave && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <Button
                                className="w-full bg-red-600 py-6 text-lg font-bold hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
                                onClick={onSave}
                                disabled={isSaving || isAnalyzing}
                            >
                                {isSaving ? "保存中..." : isAnalyzing ? "AI分析中..." : "保存する"}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
