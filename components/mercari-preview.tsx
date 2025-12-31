"use client";

import { ArrowLeft, Camera, Share, Copy, Check } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MercariPreviewProps {
    image?: string;
    title: string;
    description: string;
    price: number;
    className?: string;
}

export function MercariPreview({
    image,
    title,
    description,
    price,
    className,
}: MercariPreviewProps) {
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    return (
        <div
            className={cn(
                "relative mx-auto w-full max-w-[375px] overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-xl ring-8 ring-gray-900/5",
                className
            )}
        >
            {/* Status Bar Mock */}
            <div className="flex h-12 items-center justify-between px-6 text-xs font-medium text-gray-900">
                <span>9:41</span>
                <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-gray-900" />
                    <div className="h-2.5 w-2.5 rounded-full bg-gray-900" />
                    <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
                </div>
            </div>

            {/* App Header */}
            <div className="flex h-12 items-center justify-between px-4">
                <ArrowLeft className="h-6 w-6 text-gray-900" />
                <span className="font-bold text-gray-900">商品の情報</span>
                <Share className="h-6 w-6 text-gray-900" />
            </div>

            {/* Image Area */}
            <div className="relative aspect-square w-full bg-gray-100">
                {image ? (
                    <Image
                        src={image}
                        alt="Item"
                        fill
                        className="object-cover"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">
                        <Camera className="h-12 w-12" />
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="p-4 space-y-6">
                {/* Title Section */}
                <div className="group relative">
                    <h2 className="text-xl font-bold text-gray-900 leading-tight pr-8">
                        {title || "商品名がここに入ります"}
                    </h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -right-2 top-0 h-8 w-8 text-gray-400 hover:text-blue-600"
                        onClick={() => handleCopy(title, "title")}
                    >
                        {copiedField === "title" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <p className="mt-1 text-sm text-gray-500">
                        カテゴリー &gt; サブカテゴリー
                    </p>
                </div>

                {/* Price Section */}
                <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-red-600">¥</span>
                    <span className="text-3xl font-bold text-red-600 tracking-tight">
                        {price.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">(送料込み)</span>
                </div>

                {/* Description Section */}
                <div className="py-2 relative group">
                    <div className="flex gap-2 mb-4">
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs">目立った傷や汚れなし</span>
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs">1~2日で発送</span>
                    </div>

                    <div className="relative">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed pr-8">
                            {description || "ここにAI生成された商品説明文が表示されます。\n\n検索用キーワード：\n#メルカリ #AI #出品アシスタント"}
                        </p>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -right-2 top-0 h-8 w-8 text-gray-400 hover:text-blue-600 bg-white/80 backdrop-blur-sm"
                            onClick={() => handleCopy(description, "description")}
                        >
                            {copiedField === "description" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Footer Mock */}
            <div className="sticky bottom-0 border-t border-gray-100 bg-white p-4 pb-8">
                <Button className="w-full bg-red-600 py-6 text-lg font-bold hover:bg-red-700 text-white rounded-full">
                    出品する
                </Button>
            </div>
        </div>
    );
}
