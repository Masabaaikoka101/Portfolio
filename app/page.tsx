"use client";

import { useState } from "react";
import { ImageUploader } from "@/components/image-uploader";
import { ComparisonSlider } from "@/components/comparison-slider";
import { MercariPreview } from "@/components/mercari-preview";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    title: string;
    description: string;
    price: number;
    tags: string[];
  } | null>(null);

  const handleImageSelect = async (file: File) => {
    // 1. Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // 2. Start AI Analysis
    setIsAnalyzing(true);
    setProcessedImage(null); // Reset
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const data = await response.json();
      setAnalysisResult(data);

      // 3. Simulate "Image Processing" (In a real app, you'd get a URL back)
      setProcessedImage(URL.createObjectURL(file));

    } catch (error) {
      console.error(error);
      alert("画像の分析に失敗しました。もう一度お試しください。");
    } finally {
      setIsAnalyzing(false);
    }
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

            {/* Logic to show content: Either Analyzing or Result */}
            {isAnalyzing ? (
              <div className="max-w-xl mx-auto bg-white p-12 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">AIが画像を分析中...</h3>
                <p className="text-sm text-gray-500 mt-2">
                  商品詳細を特定し、<br />
                  市場相場を調査しています 🔍
                </p>
              </div>
            ) : processedImage ? (
              <div className="grid gap-8 lg:grid-cols-2 animate-in fade-in duration-700">
                {/* Left: Comparison */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 h-fit">
                  <h2 className="text-lg font-semibold mb-4 text-gray-700">AI 画像補正プレビュー</h2>
                  <ComparisonSlider
                    imageBefore={originalImage}
                    imageAfter={processedImage}
                  />
                  <p className="mt-2 text-xs text-gray-400 text-center">スライダーを動かして比較 (補正イメージ)</p>
                </div>

                {/* Right: Mercari Preview */}
                <div>
                  <h2 className="text-lg font-semibold mb-4 text-gray-700 text-center lg:text-left">出品プレビュー</h2>
                  <MercariPreview
                    image={processedImage}
                    title={analysisResult?.title || "タイトル生成中..."}
                    price={typeof analysisResult?.price === 'number' ? analysisResult.price : 0}
                    description={analysisResult?.description || "説明文生成中..."}
                  />
                  {/* Tags Display */}
                  {analysisResult?.tags && (
                    <div className="mt-4 flex flex-wrap gap-2 justify-center lg:justify-start">
                      {analysisResult.tags.map(tag => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="flex justify-center pt-8">
              <button
                onClick={() => {
                  setOriginalImage(null);
                  setProcessedImage(null);
                  setAnalysisResult(null);
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
