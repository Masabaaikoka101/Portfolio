/**
 * AI分析フック
 *
 * このフックの役割:
 * - 商品画像のAI分析プロセスを管理
 * - テキスト生成と画像編集を並列実行
 * - ローディング状態とエラーハンドリングを担当
 *
 * Why カスタムフックに分離するのか:
 * - 複雑な非同期処理をUIから分離
 * - ローディング状態の管理を一元化
 * - コールバック経由で結果を親に通知（制御の反転）
 *
 * 設計パターン:
 * - Callback Props Pattern: 結果を親コンポーネントに通知
 * - Promise.allSettled: 一方が失敗しても他方は継続
 *
 * Learning:
 * - Promise.allSettled: https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
 * - sonner (Toast): https://sonner.emilkowal.ski/
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { AiService } from "@/services/ai.service";
import { AnalyzeResponse } from "@/types";

/**
 * フックのProps型
 *
 * Why コールバック関数を受け取るのか:
 * - 結果の処理方法は呼び出し元が決める（制御の反転）
 * - フック自体は状態管理に専念
 * - テスト時にコールバックをモック化しやすい
 */
interface UseAiAnalysisProps {
    /** 分析対象の画像ファイル */
    selectedFile: File | null;
    /** 商品の状態（プロンプトに使用） */
    status: string;
    /** 背景タイプ */
    backgroundType: string;
    /** テキスト生成成功時のコールバック */
    onAnalysisSuccess: (result: AnalyzeResponse) => void;
    /** 画像編集成功時のコールバック */
    onImageEditSuccess: (imageUrl: string) => void;
    /** 画像編集スキップ時のコールバック */
    onImageEditSkip: () => void;
}

/**
 * AI分析フック
 *
 * Why isAnalyzingとisEditingImageを分けるのか:
 * - テキスト生成と画像編集は独立したプロセス
 * - テキスト生成が先に完了することが多い（画像生成は処理が重い）
 * - UI側で「テキストは完了、画像は処理中」の表示が可能
 *
 * @param props - コールバック関数と入力データ
 * @returns ローディング状態と分析開始関数
 */
export function useAiAnalysis({
    selectedFile,
    status,
    backgroundType,
    onAnalysisSuccess,
    onImageEditSuccess,
    onImageEditSkip,
}: UseAiAnalysisProps) {
    /** テキスト生成中フラグ */
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    /** 画像編集中フラグ */
    const [isEditingImage, setIsEditingImage] = useState(false);

    /**
     * AI分析を開始
     *
     * Why Promise.allSettledを使うのか:
     * - Promise.all: 1つ失敗すると全体が失敗（今回は不適切）
     * - Promise.allSettled: 各Promiseの成功/失敗を個別に取得
     * - 画像編集が失敗してもテキスト生成の結果は使える
     *
     * 処理フロー:
     * 1. ローディング状態をON
     * 2. テキスト生成と画像編集を並列実行
     * 3. 各結果を個別にハンドリング
     * 4. コールバックで親に通知
     * 5. ローディング状態をOFF
     */
    const startAnalysis = useCallback(async () => {
        if (!selectedFile) return;

        setIsAnalyzing(true);
        setIsEditingImage(true);

        try {
            // 並列実行：テキスト生成 + 画像編集
            const [analyzeResult, editResult] = await Promise.allSettled([
                AiService.analyzeItem(selectedFile, status),
                AiService.editImage(selectedFile, backgroundType),
            ]);

            // テキスト生成結果のハンドリング
            if (analyzeResult.status === "fulfilled") {
                onAnalysisSuccess(analyzeResult.value);
            } else {
                toast.error("テキスト生成に失敗しました");
                console.error("Analysis failed:", analyzeResult.reason);
            }

            setIsAnalyzing(false);

            // 画像編集結果のハンドリング
            if (editResult.status === "fulfilled" && editResult.value.success && editResult.value.imageUrl) {
                onImageEditSuccess(editResult.value.imageUrl);
            } else {
                // 編集失敗時はオリジナル画像にフォールバック
                if (editResult.status === "rejected") {
                    console.error("Image editing failed:", editResult.reason);
                }
                onImageEditSkip();
                toast.info("AI画像編集はスキップされました");
            }

        } catch (error) {
            // 予期せぬエラー（ネットワーク障害など）
            console.error("Unexpected error during analysis:", error);
            toast.error("分析中にエラーが発生しました");
            setIsAnalyzing(false);
        } finally {
            setIsEditingImage(false);
        }
    }, [selectedFile, status, backgroundType, onAnalysisSuccess, onImageEditSuccess, onImageEditSkip]);

    return {
        /** テキスト生成中かどうか */
        isAnalyzing,
        /** 画像編集中かどうか */
        isEditingImage,
        /** 分析を開始する関数 */
        startAnalysis,
    };
}
