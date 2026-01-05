/**
 * 商品状態選択ステップコンポーネント
 *
 * このコンポーネントの役割:
 * - 画像選択後、商品の状態を選択するステップを表示
 * - 選択された状態はAIプロンプトに使用される
 *
 * Why 状態選択を必須にするのか:
 * - メルカリでは商品状態が必須項目
 * - AIが適切な説明文を生成するために必要
 * - 例: 「新品」と「傷あり」では説明文のトーンが異なる
 *
 * 設計パターン:
 * - Controlled Component: status, setStatusを親から受け取る
 * - Callback Props: onStartAnalysis, onResetで親に通知
 *
 * Note:
 * - STATUS_OPTIONSはlib/constants.tsで定義
 * - ItemStatus型はtypes/index.tsで定義
 *
 * Learning:
 * - Radix Select: https://www.radix-ui.com/primitives/docs/components/select
 */

"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { STATUS_OPTIONS } from "@/lib/constants";
import { ItemStatus } from "@/types";

/**
 * Props型
 */
interface StatusSelectionStepProps {
    /** 選択中の画像（プレビュー用） */
    originalImage: string;
    /** 現在選択されている状態 */
    status: ItemStatus | "";
    /** 状態変更時のコールバック */
    setStatus: (status: ItemStatus | "") => void;
    /** 分析開始ボタンクリック時のコールバック */
    onStartAnalysis: () => void;
    /** リセットボタンクリック時のコールバック */
    onReset: () => void;
}

/**
 * 商品状態選択ステップコンポーネント
 *
 * Why disabled={!status}でボタンを無効化するのか:
 * - 状態未選択での分析開始を防止
 * - UXの向上（無効状態を視覚的に表示）
 *
 * @param props - コンポーネントのprops
 */
export function StatusSelectionStep({
    originalImage,
    status,
    setStatus,
    onStartAnalysis,
    onReset,
}: StatusSelectionStepProps) {
    return (
        <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in duration-300">
            <div className="space-y-4">
                {/* 画像プレビュー */}
                <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 mb-6">
                    <img
                        src={originalImage}
                        alt="Selected"
                        className="w-full h-full object-contain"
                    />
                </div>

                {/* 状態選択 */}
                <div className="space-y-2">
                    <Label htmlFor="status">商品の状態</Label>
                    <Select value={status} onValueChange={(value) => setStatus(value as ItemStatus)}>
                        <SelectTrigger id="status" className="w-full">
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
                </div>

                {/* 分析開始ボタン */}
                <Button
                    onClick={onStartAnalysis}
                    disabled={!status}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg rounded-full disabled:opacity-50"
                >
                    AIで分析を開始
                </Button>

                {/* リセットリンク */}
                <button
                    onClick={onReset}
                    className="w-full text-sm text-gray-500 hover:text-red-500 underline mt-2"
                >
                    画像を変更する
                </button>
            </div>
        </div>
    );
}
