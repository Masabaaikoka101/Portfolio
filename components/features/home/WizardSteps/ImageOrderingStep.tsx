/**
 * 画像並び替えステップコンポーネント
 *
 * このコンポーネントの役割:
 * - アップロードされた画像を確認し、ドラッグアンドドロップで並び順を変更する
 * - 1枚目がメイン画像として使用されることを明示する
 *
 * 設計パターン:
 * - Controlled Component: 画像配列を親から受け取る
 * - Callback Props: onNext, onBack, reorderImagesで親に通知
 */

"use client";

import { Reorder } from "framer-motion";
import { GripVertical, ArrowRight, ArrowLeft, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/**
 * Props型
 */
interface ImageOrderingStepProps {
    /** 選択中の画像リスト */
    originalImages: string[];
    /** 画像並び替え時のコールバック */
    reorderImages: (newIndices: number[]) => void;
    /** 次のステップへ進むコールバック */
    onNext: () => void;
    /** 前のステップへ戻るコールバック（画像再選択） */
    onBack: () => void;
}

/**
 * 画像並び替えステップコンポーネント
 */
export function ImageOrderingStep({
    originalImages,
    reorderImages,
    onNext,
    onBack,
}: ImageOrderingStepProps) {
    // 画像があるインデックスのリストを作成 (例: 2枚なら [0, 1])
    const imageIndices = originalImages.map((_, i) => i);

    return (
        <div className="max-w-xl mx-auto bg-white p-4 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-4">
                {/* ヘッダー */}
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 mb-2">
                        <ImageIcon className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">画像の順序を確認</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        ドラッグして画像の順番を入れ替えられます
                    </p>
                </div>

                {/* 画像プレビュー＆並び替えエリア */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm">画像の順序</Label>
                        <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded">
                            1枚目がメイン画像になります
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 h-[140px]">
                        {/* ドラッグ可能な画像エリア */}
                        <Reorder.Group
                            axis="x"
                            onReorder={(newIndices) => {
                                reorderImages(newIndices);
                            }}
                            values={imageIndices}
                            className="contents"
                        >
                            {imageIndices.map((index) => (
                                <Reorder.Item
                                    key={originalImages[index]}
                                    value={index}
                                    className="relative h-full rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50 group cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-lg"
                                    transition={{ type: "spring", stiffness: 200, damping: 25 }}
                                    whileDrag={{ scale: 1.05, boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}
                                >
                                    <img
                                        src={originalImages[index]}
                                        alt={`${index + 1}枚目`}
                                        className="w-full h-full object-cover pointer-events-none"
                                    />
                                    {/* 順番バッジ */}
                                    <div className="absolute top-2 left-2 bg-gray-900/80 text-white text-xs px-2 py-1 rounded font-bold z-10">
                                        {index === 0 ? "メイン" : `${index + 1}枚目`}
                                    </div>
                                    {/* ドラッグハンドルオーバーレイ */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                        <GripVertical className="text-white drop-shadow-lg w-8 h-8" />
                                    </div>
                                </Reorder.Item>
                            ))}
                        </Reorder.Group>

                        {/* 空のスロット (3枚未満の場合に表示) */}
                        {Array.from({ length: 3 - originalImages.length }).map((_, i) => (
                            <div
                                key={`empty-${i}`}
                                className="relative h-full rounded-lg overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-gray-400 gap-1"
                            >
                                <div className="text-xs font-medium">{originalImages.length + i + 1}枚目</div>
                                <span className="text-[10px]">画像なし</span>
                            </div>
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
                        画像を変更
                    </Button>
                    <Button
                        onClick={onNext}
                        className="flex-1 py-5 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        次へ進む
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
