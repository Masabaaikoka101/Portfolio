"use client";

import { ImageUploader } from "@/components/image-uploader";
import { MercariPreview } from "@/components/mercari-preview";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useItemForm } from "@/hooks/use-item-form";
import { STATUS_OPTIONS } from "@/lib/constants";

export default function Home() {
  const {
    originalImage,
    processedImage,
    isAnalyzing,
    isEditingImage,
    isSaving,
    showStatusStep,
    title,
    setTitle,
    description,
    setDescription,
    price,
    setPrice,
    status,
    setStatus,
    handleImageSelect,
    startAnalysis,
    save,
    reset,
  } = useItemForm();

  // ローディング中
  if (isAnalyzing || isEditingImage) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <div className="max-w-xl mx-auto bg-white p-12 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">
              AIが画像を分析中...
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              商品詳細を特定し、
              <br />
              画像を最適化しています 🔍
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* 初期状態: 画像アップロード */}
        {!originalImage && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                新規作成
              </h1>
              <p className="text-gray-600">
                商品の写真をアップロードしてください
              </p>
            </div>
            <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <ImageUploader
                onImageSelect={handleImageSelect}
                className="aspect-[4/3]"
              />
            </div>
          </>
        )}

        {/* ステップ2: 商品状態選択 */}
        {originalImage && showStatusStep && (
          <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in duration-300">
            <div className="space-y-4">
              <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 mb-6">
                <img
                  src={originalImage}
                  alt="Selected"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">商品の状態</Label>
                <Select value={status} onValueChange={setStatus}>
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
              <Button
                onClick={startAnalysis}
                disabled={!status}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg rounded-full disabled:opacity-50"
              >
                AIで分析を開始
              </Button>
              <button
                onClick={reset}
                className="w-full text-sm text-gray-500 hover:text-red-500 underline mt-2"
              >
                画像を変更する
              </button>
            </div>
          </div>
        )}

        {/* ステップ3: プレビュー表示 */}
        {processedImage && (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div>
              <h2 className="text-lg font-semibold mb-4 text-gray-700">
                出品プレビュー
                <span className="text-sm font-normal text-blue-600 ml-2">
                  (編集可能)
                </span>
              </h2>
              <MercariPreview
                image={processedImage}
                originalImage={originalImage!}
                title={title}
                description={description}
                price={price}
                onSave={save}
                isSaving={isSaving}
                editable={true}
                onTitleChange={setTitle}
                onDescriptionChange={setDescription}
                onPriceChange={setPrice}
              />
            </div>

            <div className="flex justify-center pt-4">
              <button
                onClick={reset}
                className="text-sm text-gray-500 hover:text-red-500 underline"
              >
                リセットしてやり直す
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
