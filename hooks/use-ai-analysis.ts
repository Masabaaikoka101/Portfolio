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
    selectedFiles,
    status,
    backgroundType,
    onAnalysisSuccess,
    onImageProcessed,
}: {
    selectedFiles: File[];
    status: string;
    backgroundType: string;
    onAnalysisSuccess: (result: AnalyzeResponse) => void;
    onImageProcessed: (index: number, imageUrl: string | null) => void;
}) {
    /** テキスト生成中フラグ */
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    /** 画像編集中フラグ（いずれかが処理中ならtrue） */
    const [isEditingImage, setIsEditingImage] = useState(false);

    /**
     * AI分析を開始
     *
     * Why 並列実行と個別コールバックを使うのか:
     * - 各画像の処理完了タイミングで即座にUIへ反映させるため（UX向上）
     * - すべての完了を待つと、ユーザーを待たせる時間が長くなる
     */
    const startAnalysis = useCallback(async () => {
        if (!selectedFiles || selectedFiles.length === 0) return;

        setIsAnalyzing(true);
        setIsEditingImage(true);

        // 1. テキスト生成（メイン画像のみ使用）
        const textAnalysisPromise = AiService.analyzeItem(selectedFiles[0], status)
            .then((result) => {
                onAnalysisSuccess(result);
            })
            .catch((error) => {
                console.error("Analysis failed:", error);
                toast.error("テキスト生成に失敗しました");
            })
            .finally(() => {
                setIsAnalyzing(false);
            });

        // 2. 画像編集（全画像並列実行）
        const imageEditPromises = selectedFiles.map(async (file, index) => {
            try {
                const result = await AiService.editImage(file, backgroundType);
                if (result.success && result.imageUrl) {
                    onImageProcessed(index, result.imageUrl);
                } else {
                    // 失敗時はnullを返し、親側でオリジナル画像へのフォールバックを処理
                    onImageProcessed(index, null);
                    if (result.error) console.error(`Image ${index} edit failed:`, result.error);
                }
            } catch (error) {
                console.error(`Image ${index} edit exception:`, error);
                onImageProcessed(index, null);
            }
        });

        // 全ての処理完了を待って編集モード終了
        // Note: 個別の更新はonImageProcessedで行われるため、ここで待つのは
        // isEditingImageフラグをOFFにするためだけ
        await Promise.all([textAnalysisPromise, ...imageEditPromises]);
        setIsEditingImage(false);

    }, [selectedFiles, status, backgroundType, onAnalysisSuccess, onImageProcessed]);

    return {
        /** テキスト生成中かどうか */
        isAnalyzing,
        /** 画像編集中かどうか */
        isEditingImage,
        /** 分析を開始する関数 */
        startAnalysis,
    };
}
