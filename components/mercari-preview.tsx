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

import { Camera, Copy, Check } from "lucide-react";
import React, { useState } from "react";
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
    /** 編集後の画像URL */
    image?: string;
    /** オリジナル画像URL（比較スライダー用） */
    originalImage?: string;
    /** 商品タイトル */
    title: string;
    /** 商品説明文 */
    description: string;
    /** 価格 */
    price: number;
    /** 追加のCSSクラス */
    className?: string;
    /** 保存ボタンクリック時のコールバック */
    onSave?: () => void;
    /** 保存中フラグ */
    isSaving?: boolean;
    /** 編集可能フラグ */
    editable?: boolean;
    /** タイトル変更時のコールバック */
    onTitleChange?: (value: string) => void;
    /** 説明文変更時のコールバック */
    onDescriptionChange?: (value: string) => void;
    /** 価格変更時のコールバック */
    onPriceChange?: (value: number) => void;
}

/**
 * メルカリ出品プレビューコンポーネント
 *
 * @param props - コンポーネントのprops
 */
export function MercariPreview({
    image,
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
}: MercariPreviewProps) {
    /**
     * コピー済みフィールド追跡（フィードバック表示用）
     *
     * Why setTimeoutでリセットするのか:
     * - 「コピー済み」表示を一時的に見せてUXを向上
     * - 2秒後に元のアイコンに戻す
     */
    const [copiedField, setCopiedField] = useState<string | null>(null);

    /**
     * クリップボードにコピー
     *
     * Why navigator.clipboard.writeTextを使うのか:
     * - 非同期でセキュアなクリップボードAPI
     * - 古いdocument.execCommand('copy')より推奨される方法
     */
    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    return (
        <div
            className={cn(
                "w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden",
                className
            )}
        >
            {/* Desktop: 横並び, Mobile: 縦積み */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                {/* 左側: 画像エリア */}
                <div className="bg-gray-50 p-4 lg:p-6">
                    <Label className="text-sm font-medium text-gray-600 mb-3 block">
                        商品画像
                        {originalImage && image && (
                            <span className="text-xs text-blue-600 ml-2">
                                (スライドで比較)
                            </span>
                        )}
                    </Label>
                    {/* 画像表示の条件分岐 */}
                    {image && originalImage ? (
                        // Before/After比較スライダー
                        <ComparisonSlider
                            imageBefore={originalImage}
                            imageAfter={image}
                            className="aspect-square rounded-lg overflow-hidden"
                        />
                    ) : image ? (
                        // 単一画像表示
                        <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                            <img src={image} alt="Item" className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        // プレースホルダー
                        <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                            <Camera className="h-12 w-12" />
                        </div>
                    )}
                </div>

                {/* 右側: コンテンツエリア */}
                <div className="p-4 lg:p-6 flex flex-col h-full">
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

                    {/* 説明文セクション（残りスペースを使用） */}
                    <div className="flex-1 flex flex-col min-h-0">
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
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onDescriptionChange?.(e.target.value)}
                                className="flex-1 w-full min-h-[250px] lg:min-h-[300px] text-sm border-gray-300 focus:border-blue-500 resize-none"
                                placeholder="商品説明を入力"
                            />
                        ) : (
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed flex-1">
                                {description || "ここにAI生成された商品説明文が表示されます。"}
                            </p>
                        )}
                    </div>

                    {/* 保存ボタン（onSaveが渡された場合のみ表示） */}
                    {onSave && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <Button
                                className="w-full bg-red-600 py-6 text-lg font-bold hover:bg-red-700 text-white rounded-lg"
                                onClick={onSave}
                                disabled={isSaving}
                            >
                                {isSaving ? "保存中..." : "保存する"}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
