"use client";

import { useState } from "react";
import { ImageUploader } from "@/components/image-uploader";
import { ComparisonSlider } from "@/components/comparison-slider";
import { MercariPreview } from "@/components/mercari-preview";

export default function Home() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);

  const handleImageSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setOriginalImage(result);
      // TODO: Here we would trigger the AI processing. For now, use the same image as mock.
      // In a real scenario, we'll wait for the API response.
      setTimeout(() => setProcessedImage(result), 1000);
    };
    reader.readAsDataURL(file);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-24 bg-zinc-50 font-sans">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex mb-12">
        <div className="text-center w-full">
          <h1 className="text-4xl font-bold text-gray-800 tracking-tight">
            AIフリマ出品アシスタント
          </h1>
          <p className="mt-4 text-gray-600">
            売れる写真と文章を、一瞬で。
          </p>
        </div>
      </div>

      <div className="w-full max-w-5xl transition-all duration-500 ease-in-out">
        {!originalImage ? (
          <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <ImageUploader
              onImageSelect={handleImageSelect}
              className="aspect-[4/3]"
            />
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {processedImage ? (
              <div className="grid gap-8 lg:grid-cols-2 animate-in fade-in duration-700">
                {/* Left: Comparison */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 h-fit">
                  <h2 className="text-lg font-semibold mb-4 text-gray-700">AI 画像補正プレビュー</h2>
                  <ComparisonSlider
                    imageBefore={originalImage}
                    imageAfter={processedImage}
                  />
                  <p className="mt-2 text-xs text-gray-400 text-center">スライダーを動かして比較</p>
                </div>

                {/* Right: Mercari Preview */}
                <div>
                  <h2 className="text-lg font-semibold mb-4 text-gray-700 text-center lg:text-left">出品プレビュー</h2>
                  <MercariPreview
                    image={processedImage}
                    title="【美品】おしゃれなビンテージ風ランプ"
                    price={3500}
                    dsecription="ご覧いただきありがとうございます。おしゃれなビンテージ風のランプです..."
                  />
                </div>
              </div>
            ) : (
              <div className="max-w-xl mx-auto bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold mb-4 text-gray-700">AI 画像補正プレビュー</h2>
                <div className="aspect-[4/3] w-full bg-gray-100 rounded-xl flex items-center justify-center animate-pulse">
                  <span className="text-gray-400">AI処理中...</span>
                </div>
              </div>
            )}

            <div className="flex justify-center pt-8">
              <button
                onClick={() => {
                  setOriginalImage(null);
                  setProcessedImage(null);
                }}
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
