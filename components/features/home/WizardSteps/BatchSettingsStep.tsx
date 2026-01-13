/**
 * 一括出品設定ステップコンポーネント
 *
 * このコンポーネントの役割:
 * - 一括出品する商品の共通設定（状態、背景処理）を行う
 * - 必要に応じて個別の調整も可能にする
 *
 * 設計パターン:
 * - Tabbed Interface: "一括設定" と "個別設定" を切り替え
 * - Controlled Input: 各設定値は useItemForm (親) で管理
 */

"use client";

import { useState, useRef } from "react";
import { Layers, Check, Settings2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";


import { ItemStatus, BatchItem } from "@/types";

// 型定義の再利用
// hooks/use-item-form.ts から BatchItem をエクスポート済み。

interface BatchSettingsStepProps {
    batchItems: BatchItem[];
    originalImages: string[];
    updateBatchItem: (index: number, updates: Partial<BatchItem>) => void;
    updateAllBatchItems: (updates: Partial<BatchItem>) => void;
    onNext: () => void;
    onBack: () => void;
    isAnalyzing?: boolean;
}

const ITEM_STATUS_OPTIONS: { value: ItemStatus; label: string }[] = [
    { value: "新品、未使用", label: "新品、未使用" },
    { value: "未使用に近い", label: "未使用に近い" },
    { value: "目立った傷や汚れなし", label: "目立った傷や汚れなし" },
    { value: "やや傷や汚れあり", label: "やや傷や汚れあり" },
    { value: "傷や汚れあり", label: "傷や汚れあり" },
    { value: "全体的に状態が悪い", label: "全体的に状態が悪い" },
];

const BACKGROUND_OPTIONS = [
    { value: "white", label: "白スタジオ" },
    { value: "remove", label: "背景削除 (透過)" },
    { value: "canvas", label: "キャンバス" },
    { value: "dark-wood", label: "ダークウッド" },
    { value: "light-wood", label: "ライトウッド" },
    { value: "marble", label: "大理石" },
    { value: "keep", label: "そのまま (変更なし)" },
];

export function BatchSettingsStep({
    batchItems,
    originalImages,
    updateBatchItem,
    updateAllBatchItems,
    onNext,
    onBack,
    isAnalyzing = false,
}: BatchSettingsStepProps) {
    const [activeTab, setActiveTab] = useState<"all" | "individual">("all");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSubmittingRef = useRef(false);

    const handleClick = async () => {
        if (isSubmittingRef.current || isAnalyzing) return;

        isSubmittingRef.current = true;
        setIsSubmitting(true);

        try {
            await onNext();
        } catch (error) {
            console.error("Failed to start batch generation:", error);
            setIsSubmitting(false);
            isSubmittingRef.current = false;
        }
    };

    // 一括設定用の一時ステート（全適用ボタンを押すまでは反映しないUIも考えられるが、
    // 即時反映の方がUXが良い場合も。ここでは即時反映で実装する。）
    // ただし、selectのvalueとして何を表示するか？
    // 全て同じならその値、混在なら "mixed" 表示？
    // 簡易的に、1つ目のアイテムの値、またはデフォルトを表示し、変更時に全適用するという形をとる。

    const globalStatus = batchItems[0]?.status || "目立った傷や汚れなし";
    const globalBackground = batchItems[0]?.backgroundType || "white";

    const handleGlobalStatusChange = (val: string) => {
        updateAllBatchItems({ status: val as ItemStatus });
    };

    const handleGlobalBackgroundChange = (val: string) => {
        updateAllBatchItems({ backgroundType: val });
    };

    // 混在チェック
    const isMixedStatus = batchItems.some(item => item.status !== globalStatus);
    const isMixedBackground = batchItems.some(item => item.backgroundType !== globalBackground);

    return (
        <div className="max-w-2xl mx-auto bg-white p-4 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* ヘッダー */}
            <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-600 mb-2">
                    <Settings2 className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">一括設定</h2>
                <p className="text-xs text-gray-500 mt-1">
                    商品の状態と背景処理を設定します
                </p>
            </div>

            {/* タブ切り替え */}
            <div className="flex p-1 bg-gray-100 rounded-lg mb-6 max-w-sm mx-auto">
                <button
                    onClick={() => setActiveTab("all")}
                    className={cn(
                        "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                        activeTab === "all"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-900"
                    )}
                >
                    まとめて設定
                </button>
                <button
                    onClick={() => setActiveTab("individual")}
                    className={cn(
                        "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                        activeTab === "individual"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-900"
                    )}
                >
                    個別に設定
                </button>
            </div>

            {/* コンテンツエリア */}
            <div className="min-h-[300px]">
                {activeTab === "all" ? (
                    <div className="space-y-4 py-2 px-2">
                        <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 flex items-start gap-3">
                            <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                            <div className="text-xs text-purple-900">
                                <p className="font-bold mb-1">まとめて設定できます</p>
                                <p className="opacity-80">ここでの設定は全ての選択商品に適用されます。<br />個別に変更したい場合はタブを切り替えてください。</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
                            <div className="space-y-2">
                                <Label className="text-sm">商品の状態</Label>
                                <Select
                                    value={isMixedStatus ? undefined : globalStatus}
                                    onValueChange={handleGlobalStatusChange}
                                >
                                    <SelectTrigger className={cn("w-full h-10", isMixedStatus && "text-gray-400 italic")}>
                                        <SelectValue placeholder={isMixedStatus ? "個別設定が混在しています" : "選択してください"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ITEM_STATUS_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm">背景の処理</Label>
                                <Select
                                    value={isMixedBackground ? undefined : globalBackground}
                                    onValueChange={handleGlobalBackgroundChange}
                                >
                                    <SelectTrigger className={cn("w-full h-10", isMixedBackground && "text-gray-400 italic")}>
                                        <SelectValue placeholder={isMixedBackground ? "個別設定が混在しています" : "選択してください"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {BACKGROUND_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {batchItems.map((item, index) => (
                            <div key={index} className="flex gap-4 p-3 border rounded-xl hover:border-blue-300 transition-colors bg-white">
                                <div className="w-20 h-20 relative shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                                    <img
                                        src={originalImages[index]}
                                        alt={`Item ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-0 left-0 bg-gray-900/70 text-white text-[10px] px-1.5 py-0.5 rounded-br">
                                        #{index + 1}
                                    </div>
                                </div>
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-gray-500">状態</Label>
                                        <Select
                                            value={item.status}
                                            onValueChange={(val) => updateBatchItem(index, { status: val as ItemStatus })}
                                        >
                                            <SelectTrigger className="h-9 text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ITEM_STATUS_OPTIONS.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-gray-500">背景</Label>
                                        <Select
                                            value={item.backgroundType}
                                            onValueChange={(val) => updateBatchItem(index, { backgroundType: val })}
                                        >
                                            <SelectTrigger className="h-9 text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {BACKGROUND_OPTIONS.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ナビゲーション */}
            {/* ナビゲーション */}
            <div className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm z-10 border-t border-gray-100 -mx-6 -mb-6 p-6 mt-8 rounded-b-2xl">
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={onBack}
                        className="flex-1 py-6 text-gray-600"
                        disabled={isAnalyzing || isSubmitting}
                    >
                        戻る
                    </Button>
                    <Button
                        onClick={handleClick}
                        disabled={isAnalyzing || isSubmitting}
                        className="flex-1 py-6 bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg shadow-purple-200"
                    >
                        {isAnalyzing || isSubmitting ? (
                            <>
                                <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                {isSubmitting ? "処理を開始中..." : "生成中..."}
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5 mr-2" />
                                AI で一括生成を開始
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
