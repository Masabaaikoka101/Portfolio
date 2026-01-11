/**
 * 商品状態選択ステップコンポーネント
 *
 * このコンポーネントの役割:
 * - 画像選択後、商品の状態と背景スタイルを選択するステップを表示
 * - 複数画像のアップロード・並び替えに対応
 * - 選択された状態はAIプロンプトに使用される
 * - 背景スタイルは画像編集時に使用される
 *
 * 設計パターン:
 * - Controlled Component: status, backgroundType, imagesを親から受け取る
 * - Callback Props: onStartAnalysis, onResetで親に通知
 */

"use client";

import Image from "next/image";
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
import {
    MultiImageUploader,
    ImagePreview,
} from "@/components/features/multi-image-uploader";

/**
 * 背景タイプの定義
 */
const BACKGROUND_OPTIONS = [
    { id: "white", name: "白スタジオ", image: null },
    { id: "canvas", name: "キャンバス", image: "/backgrounds/canvas.jpeg" },
    { id: "dark-wood", name: "ダークウッド", image: "/backgrounds/dark-wood.jpeg" },
    { id: "light-wood", name: "ライトウッド", image: "/backgrounds/light-wood.jpeg" },
    { id: "marble", name: "大理石", image: "/backgrounds/marble.jpeg" },
] as const;

/**
 * Props型
 */
interface StatusSelectionStepProps {
    /** 選択中の画像（単一画像用、後方互換性） */
    originalImage?: string;
    /** 複数画像配列（新しいフロー用） */
    images?: ImagePreview[];
    /** 複数画像変更時のコールバック */
    onImagesChange?: (images: ImagePreview[]) => void;
    /** 現在選択されている状態 */
    status: ItemStatus | "";
    /** 状態変更時のコールバック */
    setStatus: (status: ItemStatus | "") => void;
    /** 現在選択されている背景タイプ */
    backgroundType: string;
    /** 背景タイプ変更時のコールバック */
    setBackgroundType: (type: string) => void;
    /** 分析開始ボタンクリック時のコールバック */
    onStartAnalysis: () => void;
    /** リセットボタンクリック時のコールバック */
    onReset: () => void;
}

/**
 * 商品状態選択ステップコンポーネント
 */
export function StatusSelectionStep({
    originalImage,
    images = [],
    onImagesChange,
    status,
    setStatus,
    backgroundType,
    setBackgroundType,
    onStartAnalysis,
    onReset,
}: StatusSelectionStepProps) {
    // 複数画像モードかどうか
    const isMultiImageMode = onImagesChange !== undefined;

    // 表示する画像（複数画像モードの場合はメイン画像、それ以外は単一画像）
    const displayImage = isMultiImageMode
        ? images.find((img) => img.isMain)?.preview || images[0]?.preview
        : originalImage;

    // 分析開始可能かどうか
    const canStartAnalysis = status !== "" && (isMultiImageMode ? images.length > 0 : !!originalImage);

    return (
        <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in duration-300">
            <div className="space-y-4">
                {/* 画像プレビュー / マルチ画像アップローダー */}
                {isMultiImageMode ? (
                    <MultiImageUploader
                        images={images}
                        onImagesChange={onImagesChange}
                        className="mb-6"
                    />
                ) : displayImage ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 mb-6">
                        <img
                            src={displayImage}
                            alt="Selected"
                            className="w-full h-full object-contain"
                        />
                    </div>
                ) : null}

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

                {/* 背景スタイル選択 */}
                <div className="space-y-2">
                    <Label>背景スタイル</Label>
                    <div className="grid grid-cols-5 gap-2">
                        {BACKGROUND_OPTIONS.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setBackgroundType(option.id)}
                                className={`
                                    relative aspect-square rounded-lg overflow-hidden border-2 transition-all
                                    ${backgroundType === option.id
                                        ? "border-blue-500 ring-2 ring-blue-200"
                                        : "border-gray-200 hover:border-gray-300"
                                    }
                                `}
                            >
                                {option.image ? (
                                    <Image
                                        src={option.image}
                                        alt={option.name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-white flex items-center justify-center">
                                        <span className="text-xs text-gray-400">白</span>
                                    </div>
                                )}
                                {backgroundType === option.id && (
                                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500">
                        選択中: {BACKGROUND_OPTIONS.find((o) => o.id === backgroundType)?.name || "白スタジオ"}
                        {isMultiImageMode && images.length > 1 && " (全画像に適用)"}
                    </p>
                </div>

                {/* 分析開始ボタン */}
                <Button
                    onClick={onStartAnalysis}
                    disabled={!canStartAnalysis}
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

