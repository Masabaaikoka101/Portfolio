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
import { AnalyzeResponse, BatchItem } from "@/types";

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
    /** モード */
    mode?: "single" | "batch";
    /** バッチアイテム設定 */
    batchItems?: BatchItem[];
    /** バッチアイテム分析完了コールバック */
    onBatchItemAnalyzed?: (index: number, result: AnalyzeResponse) => void;
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
    mode = "single",
    batchItems = [],
    onBatchItemAnalyzed,
}: {
    selectedFiles: File[];
    status: string;
    backgroundType: string;
    onAnalysisSuccess: (result: AnalyzeResponse) => void;
    onImageProcessed: (index: number, imageUrl: string | null) => void;
    mode?: "single" | "batch";
    batchItems?: BatchItem[];
    onBatchItemAnalyzed?: (index: number, result: AnalyzeResponse) => void;
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

    /** 各アイテムごとのテキスト生成中フラグ（インデックス対応） */
    const [analyzingStates, setAnalyzingStates] = useState<boolean[]>([]);

    // ...

    const startAnalysis = useCallback(async (targetFiles?: File[], targetIndices?: number[]) => {
        const filesToProcess = targetFiles || selectedFiles;
        if (!filesToProcess || filesToProcess.length === 0) return;

        setIsAnalyzing(true);
        setIsEditingImage(true);

        const getRealIndex = (i: number) => targetIndices ? targetIndices[i] : i;

        // 対象インデックスのローディング状態をtrueにする
        setAnalyzingStates(prev => {
            const next = [...prev];
            // 配列サイズが足りない場合は拡張
            const maxIndex = targetIndices
                ? Math.max(...targetIndices)
                : filesToProcess.length - 1;

            while (next.length <= maxIndex) next.push(false);

            filesToProcess.forEach((_, i) => {
                const index = getRealIndex(i);
                next[index] = true;
            });
            return next;
        });

        if (mode === "batch") {
            // 順次処理を行うための for...of ループ
            // Why Promise.allをやめるのか: サーバー負荷軽減とレート制限回避のため
            for (let i = 0; i < filesToProcess.length; i++) {
                const file = filesToProcess[i];
                const index = getRealIndex(i);
                const itemSetting = batchItems[index];

                if (!itemSetting) {
                    console.warn(`Batch item setting not found for index ${index}. Skipping analysis.`);
                    onImageProcessed(index, null);
                    setAnalyzingStates(prev => {
                        const next = [...prev];
                        next[index] = false;
                        return next;
                    });
                    continue;
                }

                // テキスト生成と画像生成を並列で行う（1アイテム内では並列）
                const textPromise = AiService.analyzeItem(file, itemSetting.status)
                    .then((result) => {
                        onBatchItemAnalyzed?.(index, result);
                        setAnalyzingStates(prev => {
                            const next = [...prev];
                            next[index] = false;
                            return next;
                        });
                    })
                    .catch((error) => {
                        console.error(`Batch Analysis failed [${index}]:`, error);
                        setAnalyzingStates(prev => {
                            const next = [...prev];
                            next[index] = false;
                            return next;
                        });
                    });

                const bgType = itemSetting.backgroundType;
                const imagePromise = AiService.editImage(file, bgType)
                    .then((result) => {
                        if (result.success && result.imageUrl) {
                            onImageProcessed(index, result.imageUrl);
                        } else {
                            onImageProcessed(index, null);
                        }
                    })
                    .catch((error) => {
                        console.error(`Batch Image Edit failed [${index}]:`, error);
                        onImageProcessed(index, null);
                    });

                // このアイテムの処理が完了するまで待つ
                await Promise.all([textPromise, imagePromise]);

                // サーバー/APIへの配慮として少し待機
                if (i < filesToProcess.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        } else {
            const shouldAnalyzeText = !targetIndices || targetIndices.includes(0);

            let textAnalysisPromise = Promise.resolve();
            if (shouldAnalyzeText) {
                // テキスト生成
                textAnalysisPromise = AiService.analyzeItem(filesToProcess[0], status)
                    .then((result) => {
                        onAnalysisSuccess(result);
                    })
                    .catch((error) => {
                        console.error("Analysis failed:", error);
                        toast.error("テキスト生成に失敗しました");
                    })
                    .finally(() => {
                        // テキスト生成完了時点でフラグを下げる
                        setIsAnalyzing(false);
                    });
            } else {
                // テキスト生成不要なら即座にfalse
                setIsAnalyzing(false);
            }

            // 画像生成を順次実行に変更
            console.log(`[AiAnalysis] Starting sequential image processing. Total files: ${filesToProcess.length}`);

            for (let i = 0; i < filesToProcess.length; i++) {
                const file = filesToProcess[i];
                const index = getRealIndex(i);

                console.log(`[AiAnalysis] Loop iteration ${i}/${filesToProcess.length - 1}, index: ${index}, file: ${file?.name || 'undefined'}`);

                if (!file) {
                    console.error(`[AiAnalysis] File at index ${i} is undefined, skipping`);
                    onImageProcessed(index, null);
                    continue;
                }

                try {
                    console.log(`[AiAnalysis] Starting image edit for index ${index}. Background: ${backgroundType}`);
                    const result = await AiService.editImage(file, backgroundType);

                    if (result.success && result.imageUrl) {
                        console.log(`[AiAnalysis] Image ${index} edit success.`);
                        onImageProcessed(index, result.imageUrl);
                    } else {
                        console.warn(`[AiAnalysis] Image ${index} edit failed/skipped:`, result.error);
                        onImageProcessed(index, null);
                        if (result.error) {
                            toast.warning(`画像${index + 1}: 背景加工に失敗しました (${result.error})`);
                        }
                    }
                } catch (error) {
                    console.error(`[AiAnalysis] Image ${index} edit exception:`, error);
                    onImageProcessed(index, null);
                    toast.error(`画像${index + 1}: 予期せぬエラーが発生しました`);
                } finally {
                    console.log(`[AiAnalysis] Finished iteration ${i}, setting analyzingStates[${index}] = false`);
                    setAnalyzingStates(prev => {
                        const next = [...prev];
                        next[index] = false;
                        return next;
                    });

                    // サーバー/APIへの配慮として少し待機
                    if (i < filesToProcess.length - 1) {
                        console.log(`[AiAnalysis] Waiting 500ms before next iteration...`);
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
            }

            console.log(`[AiAnalysis] Sequential processing complete. All ${filesToProcess.length} images processed.`);

            setIsEditingImage(false);

            // テキスト生成がまだ終わっていなければ待つ
            await textAnalysisPromise;
        }

        setIsAnalyzing(false);
        setIsEditingImage(false);

    }, [selectedFiles, status, backgroundType, onAnalysisSuccess, onImageProcessed, mode, batchItems, onBatchItemAnalyzed]);

    return {
        /** テキスト生成中かどうか */
        isAnalyzing,
        /** 画像編集中かどうか */
        isEditingImage,
        /** 分析を開始する関数 */
        startAnalysis,
        /** 各アイテムごとの分析ステータス */
        analyzingStates,
        setAnalyzingStates,
    };
}
