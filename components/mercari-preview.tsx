/**
 * メルカリ出品プレビューコンポーネント
 *
 * このコンポーネントの役割:
 * - メルカリ出品画面を模したプレビュー表示
 * - 商品情報（画像、タイトル、説明、価格）の表示・編集
 * - クリップボードへのコピー機能
 *
 * Why このコンポーネントを作るのか:
 * - ユーザーがメルカリへ転記する際の利便性向上
 * - 実際の出品画面に近いUIで、完成イメージを確認できる
 * - コピーボタンで簡単にメルカリに転記可能
 *
 * 設計パターン:
 * - Controlled/Uncontrolled 切り替え: editable propsで編集可否を制御
 * - Compound Component風: 画像、タイトル、説明、価格を1つにまとめる
 *
 * 使用場所:
 * - メインページ（プレビューステップ）: editable=true
 * - 履歴詳細ページ: editable=false
 *
 * Learning:
 * - Clipboard API: https://developer.mozilla.org/ja/docs/Web/API/Clipboard_API
 */

"use client";

import { Camera, Copy, Check, Download, Loader2, RefreshCw } from "lucide-react";
import Image from "next/image";
import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ComparisonSlider } from "@/components/comparison-slider";
import { Label } from "@/components/ui/label";

/**
 * Props型
 *
 * Why editable propsを使うのか:
 * - 同じコンポーネントを「編集モード」と「表示モード」で使い分け
 * - コード重複を避け、一貫したデザインを保証
 */
interface MercariPreviewProps {
    /** 編集後の画像URL（単一画像、後方互換性用） */
    image?: string;
    /** 画像配列（複数画像用） */
    images?: string[];
    /** オリジナル画像URL（比較スライダー用） */
    originalImage?: string;
    /** 商品タイトル */
    title: string;
    /** 商品説明文 */
    description: string;
    /** 価格 */
    price: number;
    /** カスタムクラス名 */
    className?: string;
    /** 保存コールバック */
    onSave?: () => void;
    /** 保存中フラグ */
    isSaving?: boolean;
    /** 編集可能フラグ */
    editable?: boolean;
    /** タイトル変更コールバック */
    onTitleChange?: (value: string) => void;
    /** 説明文変更コールバック */
    onDescriptionChange?: (value: string) => void;
    /** 価格変更コールバック */
    onPriceChange?: (value: number) => void;
    /** オリジナル画像に戻すコールバック */
    onRestore?: () => void;
    /** オリジナルに戻せるかどうか */
    canRestore?: boolean;
    /** 追加画像の一括背景生成コールバック */
    onProcessAdditionalImages?: () => void;
    /** 一括生成ボタンの表示可否 */
    canProcessAdditional?: boolean;
    /** 一括処理の進捗 */
    editProgress?: number;
    /** 一括処理の総数 */
    editTotal?: number;
    /** 画像編集中フラグ */
    isEditingImage?: boolean;
    /** 画像処理中フラグ（リアルタイム生成用） */
    isProcessingImages?: boolean;
    /** テキスト処理中フラグ */
    isProcessingText?: boolean;
    /** 初期ロード中フラグ */
    isLoading?: boolean;
    /** 複数画像のURL配列 */
    multiImages?: string[];
}

/**
 * メルカリ出品プレビューコンポーネント
 */
export function MercariPreview({
    image,
    images = [],
    originalImage,
    title,
    description,
    price,
    className,
    onSave,
    isSaving = false,
    editable = false,
    onTitleChange,
    onDescriptionChange,
    onPriceChange,
    onRestore,
    canRestore = false,
    onProcessAdditionalImages,
    canProcessAdditional = false,
    editProgress = 0,
    editTotal = 0,
    isEditingImage = false,
    isProcessingImages = false,
    isProcessingText = false,
    isLoading = false,
    multiImages,
}: MercariPreviewProps) {
    /**
     * コピー済みフィールド追跡
     */
    const [copiedField, setCopiedField] = useState<string | null>(null);

    /**
     * 選択中の画像インデックス
     * imagesが渡されていない場合は常に0
     */
    const [selectedIndex, setSelectedIndex] = useState(0);

    /**
     * 表示対象の画像リスト
     * multiImages / images / image の優先順位で使用
     */
    const displayImages = multiImages && multiImages.length > 0
        ? multiImages
        : images.length > 0
            ? images
            : image
                ? [image]
                : [];

    // 現在表示すべき画像URL
    const currentImage = displayImages[selectedIndex] || image;

    /**
     * クリップボードにコピー
     */
    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    /**
     * 画像をダウンロード
     */
    const handleDownload = useCallback(async () => {
        if (!currentImage) return;

        try {
            const response = await fetch(currentImage);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${title || "image"}_${selectedIndex + 1}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download failed:", error);
        }
    }, [currentImage, title, selectedIndex]);

    return (
        <div
            className={cn(
                "w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden",
                "h-full", // 親要素の高さに合わせる
                className
            )}
        >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-full">
                {/* 左側: 画像エリア (完全固定・スクロールなし) */}
                <div className="bg-gray-50 p-4 lg:p-6 h-full overflow-hidden flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium text-gray-600">
                            商品画像
                            {displayImages.length > 1 && (
                                <span className="ml-2 text-xs text-gray-400">
                                    ({selectedIndex + 1}/{displayImages.length})
                                </span>
                            )}
                        </Label>
                        {editable && currentImage && (
                            <div className="flex items-center gap-2">
                                {/* 元に戻すボタン（canRestoreがtrueの場合のみ表示） */}
                                {canRestore && onRestore && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onRestore}
                                        className="h-7 px-2 text-orange-600 border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                                    >
                                        <span className="text-xs">元に戻す</span>
                                    </Button>
                                )}
                                {/* ダウンロードボタン */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleDownload}
                                    className="h-7 px-2 text-gray-500 hover:text-blue-600"
                                >
                                    <Download className="h-4 w-4 mr-1" />
                                    <span className="text-xs">ダウンロード</span>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* ギャラリーレイアウト */}
                    {/* 画像が1枚以上あるか、処理中/ロード中であればサムネイルエリアを表示 */}
                    <div className={cn("flex gap-3", (displayImages.length > 0 || isProcessingImages || isLoading) ? "flex-col md:flex-row" : "flex-col")}>

                        {/* サムネイル一覧 (画像が1枚以上ある場合 または 処理中/ロード中) */}
                        {(displayImages.length > 0 || isProcessingImages || isLoading) && (
                            <div className="order-1 md:order-none md:w-20 flex-shrink-0">
                                <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:max-h-[400px] pb-2 md:pb-0 scrollbar-thin scrollbar-thumb-gray-200">
                                    {/* 既存画像（または生成済み画像）のサムネイル */}
                                    {displayImages.map((img, idx) => {
                                        // 処理中判定: idx > 0 && isEditingImage && idx <= editProgress の場合は処理済み
                                        // idx > editProgress の場合は未処理（処理中 or 待機中）
                                        const isProcessing = isEditingImage && idx > 0 && idx === editProgress + 1;
                                        const isWaiting = isEditingImage && idx > 0 && idx > editProgress + 1;
                                        const isProcessed = isEditingImage && idx > 0 && idx <= editProgress;

                                        return (
                                            <button
                                                key={`thumb-${idx}`}
                                                onClick={() => setSelectedIndex(idx)}
                                                className={cn(
                                                    "relative flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden border-2 transition-all",
                                                    selectedIndex === idx
                                                        ? "border-red-500 ring-2 ring-red-100"
                                                        : "border-gray-200 hover:border-gray-300"
                                                )}
                                            >
                                                <Image
                                                    src={img}
                                                    alt={`Thumbnail ${idx + 1}`}
                                                    fill
                                                    className={cn(
                                                        "object-cover transition-opacity",
                                                        (isProcessing || isWaiting) && "opacity-50"
                                                    )}
                                                    sizes="64px"
                                                />
                                                {/* 処理中オーバーレイ */}
                                                {isProcessing && (
                                                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                                        <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                                                    </div>
                                                )}
                                                {/* 待機中オーバーレイ */}
                                                {isWaiting && (
                                                    <div className="absolute inset-0 bg-gray-900/20 flex items-center justify-center">
                                                        <div className="w-2 h-2 bg-gray-400 rounded-full" />
                                                    </div>
                                                )}
                                                {/* 処理済みチェック */}
                                                {isProcessed && (
                                                    <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}

                                    {/* 処理中/ロード中の場合、空のスケルトンスロットを表示 (合計4枚程度になるように) */}
                                    {(isProcessingImages || isLoading) && Array.from({ length: Math.max(0, 4 - displayImages.length) }).map((_, idx) => (
                                        <div
                                            key={`skeleton-${idx}`}
                                            className="relative flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                                        </div>
                                    ))}
                                </div>

                                {/* 一括背景生成ボタン（エレガントなピルスタイル） */}
                                {canProcessAdditional && (
                                    <button
                                        onClick={onProcessAdditionalImages}
                                        disabled={isEditingImage}
                                        className={cn(
                                            "mt-3 w-full py-2 px-3 rounded-full text-xs font-medium transition-all duration-200",
                                            "flex items-center justify-center gap-1.5",
                                            isEditingImage
                                                ? "bg-blue-50 text-blue-600 cursor-wait"
                                                : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-200/50 hover:shadow-lg hover:scale-[1.02] active:scale-100"
                                        )}
                                    >
                                        {isEditingImage ? (
                                            <>
                                                <div className="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                                                <span>{editProgress}/{editTotal}</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                <span>背景を統一</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* メインプレビューエリア */}
                        <div className="flex-1 order-2 md:order-none min-w-0">
                            {/* Before/After比較は、indexが0 かつ originalImageが存在する場合のみ表示 */}
                            {selectedIndex === 0 && originalImage && currentImage && !isProcessingImages ? (
                                <ComparisonSlider
                                    imageBefore={originalImage}
                                    imageAfter={currentImage}
                                    className="aspect-square rounded-lg overflow-hidden shadow-sm border border-gray-100"
                                />
                            ) : (currentImage || (isProcessingImages && originalImage) || isLoading) ? (
                                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 shadow-sm border border-gray-100 relative group">
                                    {/* 画像が存在する場合は表示 (isLoading中でも画像があれば表示) */}
                                    {(currentImage || originalImage) && (
                                        <Image
                                            src={currentImage || originalImage || ""}
                                            alt="Item Preview"
                                            fill
                                            className={cn(
                                                "object-contain transition-all duration-500",
                                                (isProcessingImages || isLoading) ? "scale-105 opacity-50 blur-[2px]" : "scale-100 opacity-100"
                                            )}
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                        />
                                    )}

                                    {/* 処理中またはロード中のオーバーレイ (シマー) */}
                                    {(isProcessingImages || isLoading) && (
                                        <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
                                            {/* 画像がある場合は白レイヤー、ない場合はグレー背景のまま */}
                                            {(currentImage || originalImage) ? (
                                                <div className="absolute inset-0 bg-white/30" />
                                            ) : (
                                                <div className="absolute inset-0 bg-gray-100" />
                                            )}
                                            {/* シンプルなシマーエフェクト */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="aspect-square rounded-lg bg-gray-50 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
                                    <Camera className="h-10 w-10 mb-2 opacity-50" />
                                    <span className="text-xs font-medium">画像なし</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 右側: コンテンツエリア（独立スクロール） */}
                <div className="p-4 lg:p-6 flex flex-col h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                    {/* タイトルセクション */}
                    <div className="mb-4">
                        <Label className="text-sm font-medium text-gray-600 mb-2 block">
                            商品名
                        </Label>
                        <div className="flex items-center gap-2">
                            {editable ? (
                                <Input
                                    value={title}
                                    onChange={(e) => onTitleChange?.(e.target.value)}
                                    className="text-lg font-bold border-gray-300 focus:border-blue-500 flex-1"
                                    placeholder="商品名を入力"
                                    maxLength={40}
                                />
                            ) : (isProcessingText || isLoading) && !title ? (
                                // タイトルスケルトン
                                <div className="h-8 w-3/4 bg-gray-200 rounded animate-pulse" />
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

                    {/* 価格セクション */}
                    <div className="mb-4">
                        <Label className="text-sm font-medium text-gray-600 mb-2 block">
                            販売価格
                        </Label>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-red-600">¥</span>
                            {editable ? (
                                <Input
                                    type="number"
                                    value={price}
                                    onChange={(e) => onPriceChange?.(parseInt(e.target.value) || 0)}
                                    className="text-2xl font-bold text-red-600 w-40 border-gray-300 focus:border-blue-500"
                                    min={0}
                                />
                            ) : (isProcessingText || isLoading) && !price ? (
                                // 価格スケルトン
                                <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
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
                    <div className="flex flex-col mt-4">
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
                        {editable ? (
                            <Textarea
                                value={description}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                    onDescriptionChange?.(e.target.value);
                                    // 自動リサイズ
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                }}
                                className="w-full min-h-[200px] text-sm border-gray-300 focus:border-blue-500 resize-none leading-relaxed overflow-hidden"
                                placeholder="商品説明を入力"
                                ref={(ref) => {
                                    if (ref) {
                                        ref.style.height = 'auto';
                                        ref.style.height = `${ref.scrollHeight}px`;
                                    }
                                }}
                            />
                        ) : (isProcessingText || isLoading) && !description ? (
                            // 説明文スケルトン
                            <div className="space-y-2 w-full animate-pulse">
                                <div className="h-4 bg-gray-200 rounded w-full" />
                                <div className="h-4 bg-gray-200 rounded w-5/6" />
                                <div className="h-4 bg-gray-200 rounded w-4/5" />
                                <div className="h-4 bg-gray-200 rounded w-full" />
                                <div className="h-4 bg-gray-200 rounded w-3/4" />
                            </div>
                        ) : (
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {description || "ここにAI生成された商品説明文が表示されます。"}
                            </p>
                        )}
                    </div>

                    {/* 保存ボタン */}
                    {onSave && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <Button
                                className="w-full bg-red-600 py-6 text-lg font-bold hover:bg-red-700 text-white rounded-lg shadow-sm transition-colors"
                                onClick={onSave}
                                disabled={isSaving}
                            >
                                {isSaving ? "保存中..." : "保存する"}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
