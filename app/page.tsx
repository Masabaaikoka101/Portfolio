/**
 * メインページ（ホーム）
 *
 * このページの役割:
 * - 商品出品フローのメインUI
 * - 画像アップロード → 状態選択 → AI分析 → プレビュー の流れを管理
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

import { useEffect } from "react";
import { useItemForm } from "@/hooks/use-item-form";
import { useAuth } from "@/hooks/use-auth";
import { useFileSelect } from "@/contexts/file-select-context";
import { EmptyState } from "@/components/features/home/EmptyState";
import { StatusSelectionStep } from "@/components/features/home/StatusSelectionStep";
import { AnalysisLoading } from "@/components/features/home/AnalysisLoading";
import { PreviewStep } from "@/components/features/home/PreviewStep";
import { Loader2 } from "lucide-react";

/**
 * 認証チェック中のローディング画面
 */
function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">認証を確認中...</p>
      </div>
    </div>
  );
}

/**
 * ホームページコンポーネント
 */
export default function Home() {
  // =========================================================================
  // 認証チェック（ログイン必須）
  // =========================================================================
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth({
    required: true,
    redirectTo: "/login",
  });

  // =========================================================================
  // ファイル選択コンテキスト（ヘッダーからのファイル選択を受け取る）
  // =========================================================================
  const { selectedFile, clearFile } = useFileSelect();

  // =========================================================================
  // フォーム状態
  // =========================================================================
  const {
    // 画像状態
    originalImage,
    processedImage,
    // ローディング状態
    isAnalyzing,
    isEditingImage,
    isSaving,
    showStatusStep,
    // フォームフィールド
    title,
    setTitle,
    description,
    setDescription,
    price,
    setPrice,
    status,
    setStatus,
    // アクション
    handleImageSelect,
    startAnalysis,
    save,
    reset,
  } = useItemForm();

  // =========================================================================
  // ヘッダーからのファイル選択を処理
  // =========================================================================
  useEffect(() => {
    if (selectedFile) {
      handleImageSelect(selectedFile);
      clearFile(); // 処理後にクリア
    }
  }, [selectedFile, handleImageSelect, clearFile]);

  // =========================================================================
  // 認証チェック中
  // =========================================================================
  if (isAuthLoading) {
    return <AuthLoading />;
  }

  // =========================================================================
  // 未認証（リダイレクト中）
  // =========================================================================
  if (!isAuthenticated) {
    return <AuthLoading />;
  }

  // =========================================================================
  // ローディング中はフルスクリーンローディングを表示
  // =========================================================================
  if (isAnalyzing || isEditingImage) {
    return <AnalysisLoading />;
  }

  // =========================================================================
  // メインレンダリング
  // =========================================================================
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* ステップ1: 画像アップロード（初期状態） */}
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

        {/* ステップ3: プレビュー表示（AI分析完了後） */}
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
