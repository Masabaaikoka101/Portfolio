/**
 * メインページ（ホーム）
 *
 * このページの役割:
 * - 商品出品フローのメインUI
 * - ウィザード形式で画像選択 → 並び替え → 状態選択 → 背景選択 → プレビュー へ遷移
 *
 * Why クライアントコンポーネントなのか:
 * - useItemFormフック（useState, useEffect）を使用
 * - ユーザーインタラクション（画像選択、分析開始等）が必要
 * - リアルタイムの状態更新が必要
 *
 * 認証について:
 * - useAuthフックでログイン必須チェック
 * - 未ログイン時は自動的にログインページへリダイレクト
 *
 * ファイル選択について:
 * - ヘッダーの「新規作成」からも画像選択可能
 * - FileSelectContextで共有
 *
 * 設計パターン:
 * - Container Component: 状態管理を担当
 * - Presentational Components: 各ステップの表示は専用コンポーネントに委譲
 * - Conditional Rendering: 状態に応じて表示するコンポーネントを切り替え
 *
 * Learning:
 * - Next.js App Router: https://nextjs.org/docs/app
 * - React Conditional Rendering: https://react.dev/learn/conditional-rendering
 */

"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useItemForm } from "@/hooks/use-item-form";
import { useAuth } from "@/hooks/use-auth";
import { useNavigationGuard } from "@/contexts/navigation-guard-context";
import { EmptyState } from "@/components/features/home/EmptyState";
import { PreviewStep } from "@/components/features/home/PreviewStep";
import {
  ImageOrderingStep,
  ConditionSelectionStep,
  BackgroundSelectionStep,
  BatchSettingsStep,
} from "@/components/features/home/WizardSteps";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * 認証チェック中のローディング画面
 */
function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">認証を確認中...</p>
      </div>
    </div>
  );
}

/**
 * ステップインジケーターコンポーネント
 */
function StepIndicator({ currentStep, mode }: { currentStep: string; mode: "single" | "batch" }) {
  const steps = mode === "batch"
    ? [
      { id: "reorder", label: "画像" },
      { id: "batch_settings", label: "設定" }, // 一括設定
    ]
    : [
      { id: "reorder", label: "画像" },
      { id: "condition", label: "状態" },
      { id: "background", label: "背景" },
    ];

  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  // uploadやpreviewの場合は表示しない
  if (currentIndex === -1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-2">
          <div
            className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-300
              ${index <= currentIndex
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground"
              }
            `}
          >
            {index + 1}
          </div>
          <span
            className={`text-sm hidden sm:inline transition-colors duration-300 ${index === currentIndex ? "text-primary font-medium" : "text-muted-foreground"
              }`}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div
              className={`w-8 h-0.5 rounded-full transition-colors duration-300 ${index < currentIndex ? "bg-primary" : "bg-muted"
                }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * フォーム状態とUIを管理するメインコンポーネント（Suspenseでラップされる内部コンポーネント）
 */
function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  /* unused */

  // ... (useAuth omitted for brevity, logic remains)
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth({
    required: true,
    redirectTo: "/login",
  });

  const {
    originalImages,
    processedImages,
    currentPreviewIndex,
    isAnalyzing,
    isSaving,
    currentStep,
    goToNextStep,
    goToPrevStep,
    title,
    setTitle,
    description,
    setDescription,
    price,
    setPrice,
    status,
    setStatus,
    backgroundType,
    setBackgroundType,
    setCurrentPreviewIndex,
    handleFilesSelect,
    startAnalysis,
    startBatchWithDrafts,
    save: saveItem,
    reset,
    reorderImages,
    mode,
    batchItems,
    updateBatchItem,
    updateAllBatchItems,
    addImages,
    removeImage,
    analyzingStates,
    selectMode,
    isModeSelected,
    regenerateCurrentImage,
  } = useItemForm({
    onSuccess: () => {
      // 保存成功後はナビゲーションガードを解除してから遷移
      setNavigationGuard(false);
      router.push("/");
    },
  });

  // ... (navigation guard and useEffects omitted)
  const { setNavigationGuard } = useNavigationGuard();
  const shouldBlock = currentStep === "preview" && !isSaving;
  useEffect(() => {
    setNavigationGuard(shouldBlock);
    return () => setNavigationGuard(false);
  }, [shouldBlock, setNavigationGuard]);
  useEffect(() => {
    if (!shouldBlock) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shouldBlock]);
  useEffect(() => {
    const shouldReset = searchParams.get("reset") === "true";
    if (shouldReset) {
      reset();
      router.replace("/new", { scroll: false });
    }
  }, [searchParams, reset, router]);

  if (isAuthLoading) {
    return <AuthLoading />;
  }
  if (!isAuthenticated) {
    return <AuthLoading />;
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      {/* ステップインジケーター */}
      <StepIndicator currentStep={currentStep} mode={mode} />

      {/* アニメーション付きステップ切り替え */}
      <AnimatePresence mode="wait">
        {/* 1. アップロード画面 */}
        {currentStep === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <EmptyState
              onFilesSelect={handleFilesSelect}
              onModeChange={selectMode}
              currentMode={mode}
              isModeSelected={isModeSelected}
              onBack={() => reset({ keepMode: false })}
            />
          </motion.div>
        )}

        {/* 2. 画像並び替え画面 */}
        {currentStep === "reorder" && (
          <motion.div
            key="reorder"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <ImageOrderingStep
              originalImages={originalImages}
              reorderImages={reorderImages}
              onAddImages={addImages}
              onDeleteImage={removeImage}
              onNext={goToNextStep}
              onBack={() => reset({ keepMode: true })}
              mode={mode}
            />
          </motion.div>
        )}

        {/* 2.5. 一括設定画面 (Batchモードのみ) */}
        {currentStep === "batch_settings" && (
          <motion.div
            key="batch_settings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <BatchSettingsStep
              batchItems={batchItems}
              originalImages={originalImages}
              updateBatchItem={updateBatchItem}
              updateAllBatchItems={updateAllBatchItems}
              onNext={async () => {
                // 下書きを即座に作成（元画像で）
                const createdIds = await startBatchWithDrafts();

                if (createdIds.length === 0) {
                  // 作成失敗時は遷移しない
                  return;
                }

                // 状態をリセット（ホーム再訪問時の誤動作防止）
                reset();

                // 作成成功後、即座に履歴へ遷移
                toast.success(`${createdIds.length}件の生成を開始しました`);
                router.push("/");

                // バックグラウンド処理は startBatchWithDrafts 内で継続される
              }}
              onBack={goToPrevStep}
              isAnalyzing={isAnalyzing}
            />
          </motion.div>
        )}

        {/* 3. 商品状態選択画面 */}
        {currentStep === "condition" && (
          <motion.div
            key="condition"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <ConditionSelectionStep
              status={status}
              setStatus={setStatus}
              onNext={goToNextStep}
              onBack={goToPrevStep}
            />
          </motion.div>
        )}

        {/* 4. 背景選択画面 */}
        {currentStep === "background" && (
          <motion.div
            key="background"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <BackgroundSelectionStep
              backgroundType={backgroundType}
              setBackgroundType={setBackgroundType}
              onStartAnalysis={startAnalysis}
              onBack={goToPrevStep}
              onReset={() => reset({ keepMode: true })}
            />
          </motion.div>
        )}

        {/* 5. プレビュー画面 */}
        {currentStep === "preview" && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <PreviewStep
              processedImages={processedImages}
              originalImages={originalImages}
              isAnalyzing={isAnalyzing}
              currentPreviewIndex={currentPreviewIndex}
              setCurrentPreviewIndex={setCurrentPreviewIndex}
              title={title}
              description={description}
              price={price}
              status={status}
              isSaving={isSaving}
              setTitle={setTitle}
              setDescription={setDescription}
              setPrice={setPrice}
              setStatus={setStatus}
              onSave={saveItem}
              onReset={reset}
              onEditImage={() => {
                reset({ keepMode: true });
              }}
              mode={mode}
              batchItems={batchItems}
              updateBatchItem={updateBatchItem}
              onReorder={reorderImages}
              onAddImage={addImages}
              onDeleteImage={removeImage}
              analyzingStates={analyzingStates}
              onRegenerate={regenerateCurrentImage}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * ホームページ（Root Page）
 * Suspense境界を提供してuseSearchParams使用時のクライアントサイドレンダリングをサポート
 */
export default function Home() {
  return (
    <main className="min-h-screen bg-muted/30 pb-20">
      <Suspense fallback={<AuthLoading />}>
        <HomeContent />
      </Suspense>
    </main>
  );
}
