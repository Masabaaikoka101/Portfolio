"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { useItemForm } from "@/hooks/use-item-form";
import { MultiImageUploader, ImagePreview } from "@/components/features/multi-image-uploader";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ItemStatus } from "@/types";
import { ITEM_OPTIONS, BACKGROUND_OPTIONS, DEFAULTS } from "@/lib/constants";

/**
 * ステップインジケーター
 */
function StepIndicator({
    hasImages,
    hasStatus,
    hasBackground,
}: {
    hasImages: boolean;
    hasStatus: boolean;
    hasBackground: boolean;
}) {
    const steps = [
        { num: 1, label: "画像", completed: hasImages },
        { num: 2, label: "商品の状態", completed: hasStatus },
        { num: 3, label: "背景", completed: hasBackground },
    ];

    return (
        <div className="flex items-center justify-center mb-8">
            {steps.map((step, index) => (
                <div key={index} className="flex items-center">
                    {/* ステップ */}
                    <div className="flex items-center gap-2">
                        {/* 番号サークル */}
                        <div
                            className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                                step.completed
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-200 text-gray-500"
                            )}
                        >
                            {step.completed ? "✓" : step.num}
                        </div>
                        {/* ラベル */}
                        <span
                            className={cn(
                                "text-sm font-medium",
                                step.completed ? "text-blue-600" : "text-gray-400"
                            )}
                        >
                            {step.label}
                        </span>
                    </div>
                    {/* 矢印コネクター */}
                    {index < steps.length - 1 && (
                        <div className="flex items-center mx-4">
                            <div
                                className={cn(
                                    "w-8 h-0.5",
                                    step.completed ? "bg-blue-300" : "bg-gray-200"
                                )}
                            />
                            <div
                                className={cn(
                                    "w-0 h-0 border-t-[4px] border-b-[4px] border-l-[6px] border-t-transparent border-b-transparent",
                                    step.completed ? "border-l-blue-300" : "border-l-gray-200"
                                )}
                            />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

/**
 * 認証チェック中のローディング
 */
function AuthLoading() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">認証を確認中...</p>
            </div>
        </div>
    );
}

/**
 * 新規作成ページ
 */
export default function NewItemPage() {
    const router = useRouter();

    // 認証チェック
    const { isLoading: isAuthLoading, isAuthenticated } = useAuth({
        requireAuth: true,
        redirectTo: "/login",
    });

    // useItemFormから状態とアクションを取得
    const {
        multiImages,
        setMultiImages,
        status,
        setStatus,
        backgroundType,
        setBackgroundType,
        isAnalyzing,
        isEditingImage,
        startRealtimeFlow,
    } = useItemForm();

    // 入力チェック
    const hasImages = multiImages.length > 0;
    const hasStatus = status !== "";
    const hasBackground = backgroundType !== "";
    const canGenerate = hasImages && hasStatus && hasBackground;

    // 生成開始
    const handleGenerate = useCallback(async () => {
        if (!canGenerate) return;

        startRealtimeFlow((itemId) => {
            router.push(`/items/${itemId}`);
        });
    }, [canGenerate, startRealtimeFlow, router]);

    // 認証チェック中
    if (isAuthLoading || !isAuthenticated) {
        return <AuthLoading />;
    }

    return (
        <main className="min-h-screen bg-gray-50 py-8">
            <div className="container max-w-2xl mx-auto px-4">
                {/* ヘッダー */}
                <div className="flex items-center gap-4 mb-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/")}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-900">新規作成</h1>
                </div>

                {/* ステップインジケーター - Sticky Header */}
                <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm pt-4 pb-2 mb-6 -mx-4 px-4 border-b border-gray-200/50 transition-all">
                    <StepIndicator
                        hasImages={hasImages}
                        hasStatus={hasStatus}
                        hasBackground={hasBackground}
                    />
                </div>

                {/* 画像アップロード */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        {hasImages && <Check className="h-5 w-5 text-blue-600" />}
                        商品画像
                    </h2>
                    <MultiImageUploader
                        images={multiImages}
                        onImagesChange={setMultiImages}
                        maxImages={10}
                    />
                </div>

                {/* 商品状態 */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        {hasStatus && <Check className="h-5 w-5 text-blue-600" />}
                        商品の状態
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {ITEM_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setStatus(option.value as ItemStatus)}
                                className={cn(
                                    "px-4 py-3 rounded-lg text-sm font-medium transition-all border-2",
                                    status === option.value
                                        ? "border-blue-500 bg-blue-50 text-blue-700"
                                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 背景タイプ */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        {hasBackground && <Check className="h-5 w-5 text-blue-600" />}
                        背景タイプ
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {BACKGROUND_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setBackgroundType(option.value)}
                                className={cn(
                                    "relative group rounded-xl overflow-hidden transition-all border-2 aspect-[4/3]",
                                    backgroundType === option.value
                                        ? "border-blue-500 ring-4 ring-blue-100"
                                        : "border-gray-200 hover:border-gray-300"
                                )}
                            >
                                {/* 背景画像 */}
                                <div className="absolute inset-0">
                                    {option.image ? (
                                        <Image
                                            src={option.image}
                                            alt={option.label}
                                            fill
                                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                                            sizes="(max-width: 768px) 50vw, 33vw"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-white border-b" />
                                    )}
                                </div>

                                {/* オーバーレイとラベル */}
                                <div className={cn(
                                    "absolute inset-x-0 bottom-0 p-3 flex flex-col justify-end transition-all",
                                    "bg-gradient-to-t from-black/40 via-black/20 to-transparent",
                                    backgroundType === option.value ? "h-full bg-blue-900/20" : "h-1/2"
                                )}>
                                    <div className="text-white font-bold text-sm md:text-base leading-tight">
                                        {option.label}
                                    </div>
                                    <div className="text-white/80 text-xs truncate mt-0.5">
                                        {option.description}
                                    </div>

                                    {/* 選択中のチェックマーク */}
                                    {backgroundType === option.value && (
                                        <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1 shadow-sm">
                                            <Check className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 生成ボタン */}
                <Button
                    onClick={handleGenerate}
                    disabled={!canGenerate || isAnalyzing || isEditingImage}
                    className={cn(
                        "w-full py-4 text-base font-semibold rounded-xl transition-all",
                        canGenerate
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200/50"
                            : "bg-gray-200 text-gray-400 opacity-50 cursor-not-allowed"
                    )}
                >
                    {isAnalyzing || isEditingImage ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            生成中...
                        </>
                    ) : (
                        "生成開始"
                    )}
                </Button>
            </div>
        </main>
    );
}
