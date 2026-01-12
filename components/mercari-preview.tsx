import { Camera, Copy, Check, Download, Edit2, Sparkles } from "lucide-react";
import React from "react";
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
}: MercariPreviewProps) {
    const { copiedField, handleCopy, handleDownload } = useMercariPreview();

    // 互換性対応: 配列がない場合は単体propを使用
    const images = propImages ?? (image ? [image] : []);
    const originalImages = propOriginalImages ?? (originalImage ? [originalImage] : []);

    // 表示用データの解決
    const currentProcessed = images[selectedIndex] ?? null; // nullなら処理中または未生成
    const currentOriginal = originalImages[selectedIndex];

    // 表示すべき画像: 処理済みがあればそれ、なければオリジナル
    const displayImage = currentProcessed ?? currentOriginal;

    // ローディング状態: 指定があればそれ、なければ analyze中なら全体的に... (画像個別のloadingStatesがあればそちら優先)
    const isImageLoading = loadingStates?.[selectedIndex] ?? false;

    // スロット表示が必要か（複数画像がある場合）
    const showThumbnails = (originalImages.length > 1);

    // テキストローディング（スケルトン）表示用
    const TextSkeleton = ({ className }: { className?: string }) => (
        <div className={cn("animate-pulse bg-gray-200 rounded", className)} />
    );

    return (
        <div
            className={cn(
                "w-full bg-white rounded-xl border border-gray-200 shadow-sm",
                className
            )}
        >
            {/* Desktop: 画像優先レイアウト (約5.5:4.5), Mobile: 縦積み */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-0 lg:gap-8 items-start">
                {/* 左側: 画像エリア (PCではSticky) */}
                <div className="bg-gray-50/50 p-6 lg:p-10 flex flex-col gap-6 md:sticky md:top-6 md:h-fit rounded-xl border border-gray-100 shadow-sm m-4 lg:m-0 lg:border-0 lg:shadow-none lg:bg-transparent">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-gray-600">
                            商品画像
                        </Label>
                        <div className="flex gap-2">
                            {editable && displayImage && onEditImage && !isImageLoading && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onEditImage}
                                    className="h-7 px-2 text-gray-500 hover:text-blue-600"
                                >
                                    <Edit2 className="h-4 w-4 mr-1" />
                                    <span className="text-xs">編集</span>
                                </Button>
                            )}
                            {editable && displayImage && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDownload(displayImage, title)}
                                    className="h-7 px-2 text-gray-500 hover:text-blue-600"
                                >
                                    <Download className="h-4 w-4 mr-1" />
                                    <span className="text-xs">DL</span>
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* 画像とサムネイルのラッパー */}
                    <div className="flex flex-col md:flex-row gap-3">
                        {/* サムネイルリスト (Mobile:上 / Desktop:左) */}
                        {showThumbnails && (
                            <div className="order-1 grid grid-cols-4 md:grid-cols-1 gap-1 w-full md:w-20 md:shrink-0 content-start">
                                {originalImages.map((orig, i) => {
                                    const processed = images[i];
                                    const isThisLoading = loadingStates?.[i] ?? false;
                                    const thumbSrc = processed ?? orig;
                                    const isActive = i === selectedIndex;

                                    return (
                                        <button
                                            key={i}
                                            onClick={() => onImageSelect?.(i)}
                                            className={cn(
                                                "relative aspect-square rounded-md overflow-hidden border-2 transition-all w-full",
                                                isActive ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200 hover:border-gray-300"
                                            )}
                                        >
                                            <Image
                                                src={thumbSrc}
                                                alt={`Slot ${i}`}
                                                fill
                                                className="object-cover"
                                                unoptimized
                                            />
                                            {isThisLoading && (
                                                <div className="absolute inset-0 bg-white/60 animate-pulse flex items-center justify-center">
                                                    <span className="text-xs text-white font-medium drop-shadow-md">生成中</span>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* メイン画像表示エリア */}
                        <div className="order-2 flex-1 relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100 group border border-gray-200 shadow-inner">
                            {displayImage && currentOriginal && currentProcessed ? (
                                // 処理済み＆オリジナルあり -> 比較スライダー
                                <ComparisonSlider
                                    imageBefore={currentOriginal}
                                    imageAfter={currentProcessed}
                                    className="w-full h-full"
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
                        </div>
                    </div>
                </div>

                {/* 右側: コンテンツエリア */}
                <div className="p-4 lg:p-6 flex flex-col h-full">
                    {/* タイトルセクション */}
                    <div className="mb-4">
                        <Label className="text-sm font-medium text-gray-600 mb-2 block">
                            商品名
                        </Label>
                        <div className="flex items-center gap-2">
                            {isAnalyzing ? (
                                <TextSkeleton className="h-10 flex-1" />
                            ) : editable ? (
                                <Input
                                    value={title}
                                    onChange={(e) => onTitleChange?.(e.target.value)}
                                    className="text-lg font-bold border-gray-300 focus:border-blue-500 flex-1"
                                    placeholder="商品名を入力"
                                    maxLength={40}
                                />
                            ) : (
                                <h2 className="text-lg lg:text-xl font-bold text-gray-900 leading-tight flex-1">
                                    {title || "商品名がここに入ります"}
                                </h2>
                            )}
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
                            <span className="text-lg font-bold text-red-600">¥</span>
                            {isAnalyzing ? (
                                <TextSkeleton className="h-10 w-40" />
                            ) : editable ? (
                                <Input
                                    type="number"
                                    value={price}
                                    onChange={(e) => onPriceChange?.(parseInt(e.target.value) || 0)}
                                    className="text-2xl font-bold text-red-600 w-40 border-gray-300 focus:border-blue-500"
                                    min={0}
                                />
                            ) : (
                                <span className="text-2xl lg:text-3xl font-bold text-red-600">
                                    {price.toLocaleString()}
                                </span>
                            )}
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
                    </div>

                    {/* 説明文セクション */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium text-gray-600">
                                商品説明
                            </Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-gray-400 hover:text-blue-600 flex items-center gap-1"
                                onClick={() => handleCopy(description, "description")}
                                title="商品説明をコピー"
                            >
                                {copiedField === "description" ? (
                                    <><Check className="h-3.5 w-3.5 text-green-500" /><span className="text-xs">コピー済み</span></>
                                ) : (
                                    <><Copy className="h-3.5 w-3.5" /><span className="text-xs">コピー</span></>
                                )}
                            </Button>
                        </div>
                        {isAnalyzing ? (
                            <div className="space-y-2">
                                <TextSkeleton className="h-4 w-full" />
                                <TextSkeleton className="h-4 w-5/6" />
                                <TextSkeleton className="h-4 w-4/6" />
                                <TextSkeleton className="h-20 w-full mt-4" />
                            </div>
                        ) : editable ? (
                            <Textarea
                                value={description}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onDescriptionChange?.(e.target.value)}
                                className="w-full min-h-[400px] text-sm border-gray-300 focus:border-blue-500 resize-y"
                                placeholder="商品説明を入力"
                            />
                        ) : (
                            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed p-2 bg-gray-50 rounded border border-gray-100 min-h-[200px]">
                                {description || "ここにAI生成された商品説明文が表示されます。"}
                            </div>
                        )}
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
