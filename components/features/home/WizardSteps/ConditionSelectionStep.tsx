/**
 * 商品状態選択ステップコンポーネント
 *
 * このコンポーネントの役割:
 * - 商品の状態（新品、未使用に近い、等）を選択する
 * - シンプルで集中しやすいUIを提供
 *
 * 設計パターン:
 * - Controlled Component: statusを親から受け取る
 * - Callback Props: onNext, onBack, setStatusで親に通知
 */

"use client";

import { ArrowRight, ArrowLeft, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { STATUS_OPTIONS } from "@/lib/constants";
import { ItemStatus } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Props型
 */
interface ConditionSelectionStepProps {
    /** 現在選択されている状態 */
    status: ItemStatus | "";
    /** 状態変更時のコールバック */
    setStatus: (status: ItemStatus | "") => void;
    /** 次のステップへ進むコールバック */
    onNext: () => void;
    /** 前のステップへ戻るコールバック */
    onBack: () => void;
}

/**
 * 商品状態選択ステップコンポーネント
 */
export function ConditionSelectionStep({
    status,
    setStatus,
    onNext,
    onBack,
}: ConditionSelectionStepProps) {
    return (
        <div className="max-w-xl mx-auto bg-white p-4 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-4">
                {/* ヘッダー */}
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-600 mb-2">
                        <Tag className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">商品の状態を選択</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        商品の状態を正確に選んでください
                    </p>
                </div>

                {/* 状態選択グリッド */}
                <div className="space-y-2">
                    <Label className="text-sm">商品の状態</Label>
                    <div className="grid grid-cols-1 gap-1.5">
                        {STATUS_OPTIONS.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setStatus(option)}
                                className={cn(
                                    "w-full text-left px-3 py-2 rounded-lg border-2 transition-all text-sm",
                                    "hover:border-green-400 hover:bg-green-50/50",
                                    status === option
                                        ? "border-green-500 bg-green-50 text-green-700 font-medium"
                                        : "border-gray-200 bg-white text-gray-700"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <span>{option}</span>
                                    {status === option && (
                                        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ナビゲーションボタン */}
                <div className="flex gap-3 pt-1">
                    <Button
                        variant="outline"
                        onClick={onBack}
                        className="flex-1 py-5 text-gray-600"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        戻る
                    </Button>
                    <Button
                        onClick={onNext}
                        disabled={!status}
                        className="flex-1 py-5 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                    >
                        次へ進む
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
