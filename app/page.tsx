"use client";

import { useItemForm } from "@/hooks/use-item-form";
import { EmptyState } from "@/components/features/home/EmptyState";
import { StatusSelectionStep } from "@/components/features/home/StatusSelectionStep";
import { AnalysisLoading } from "@/components/features/home/AnalysisLoading";
import { PreviewStep } from "@/components/features/home/PreviewStep";

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
    return <AnalysisLoading />;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* 初期状態: 画像アップロード */}
        {!originalImage && <EmptyState onImageSelect={handleImageSelect} />}

        {/* ステップ2: 商品状態選択 */}
        {originalImage && showStatusStep && (
          <StatusSelectionStep
            originalImage={originalImage}
            status={status}
            setStatus={setStatus}
            onStartAnalysis={startAnalysis}
            onReset={reset}
          />
        )}

        {/* ステップ3: プレビュー表示 */}
        {processedImage && (
          <PreviewStep
            processedImage={processedImage}
            originalImage={originalImage!}
            title={title}
            description={description}
            price={price}
            isSaving={isSaving}
            setTitle={setTitle}
            setDescription={setDescription}
            setPrice={setPrice}
            onSave={save}
            onReset={reset}
          />
        )}
      </div>
    </main>
  );
}
