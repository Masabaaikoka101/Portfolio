"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { HelpCircle, Plus, X } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export function SiteHeader() {
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-white">
            <div className="container flex h-16 items-center justify-between px-4">
                {/* Left: Logo + App Name */}
                <Link href="/history" className="flex items-center gap-1">
                    <Image
                        src="/logo.svg"
                        alt="AXEL"
                        width={48}
                        height={48}
                        className="object-contain"
                    />
                    <span className="text-lg font-bold text-gray-900 tracking-tight">
                        AXEL
                    </span>
                </Link>

                {/* Right: Navigation */}
                <div className="flex items-center gap-3">
                    <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
                        <DialogTrigger asChild>
                            <button
                                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                <HelpCircle className="h-4 w-4" />
                                <span className="hidden sm:inline">使い方</span>
                            </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold">
                                    AXELの使い方
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="flex gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                                        1
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">商品画像をアップロード</h3>
                                        <p className="text-sm text-gray-600">
                                            売りたい商品の写真を選択してください
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                                        2
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">商品の状態を選択</h3>
                                        <p className="text-sm text-gray-600">
                                            新品〜中古まで状態を選んでください
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                                        3
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">AIが自動生成</h3>
                                        <p className="text-sm text-gray-600">
                                            商品名・説明文・価格をAIが提案します
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                                        4
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">編集して保存</h3>
                                        <p className="text-sm text-gray-600">
                                            内容を確認・編集してから保存できます
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <Button
                                onClick={() => setIsHelpOpen(false)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full"
                            >
                                閉じる
                            </Button>
                        </DialogContent>
                    </Dialog>
                    <Link href="/">
                        <Button className="bg-gray-900 text-white hover:bg-gray-800 rounded-full px-4 flex items-center gap-1.5">
                            <Plus className="h-4 w-4" />
                            <span>新規作成</span>
                        </Button>
                    </Link>
                </div>
            </div>
        </header>
    );
}
