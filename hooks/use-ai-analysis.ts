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
            // Batch processing with limited concurrency
            const CONCURRENCY_LIMIT = 5;
            console.log(`[AiAnalysis] Starting batch parallel processing (Limit: ${CONCURRENCY_LIMIT}). Total files: ${filesToProcess.length}`);

            const queue = filesToProcess.map((file, i) => ({ file, index: getRealIndex(i) }));
            const workers = Array(Math.min(CONCURRENCY_LIMIT, filesToProcess.length))
                .fill(null)
                .map(async (_, workerId) => {
                    while (queue.length > 0) {
                        const task = queue.shift();
                        if (!task) break;

                        const { file, index } = task;
                        const itemSetting = batchItems[index];

                        console.log(`[AiAnalysis/Batch] Worker ${workerId} starting index ${index}`);

                        if (!itemSetting) {
                            console.warn(`Batch item setting not found for index ${index}. Skipping.`);
                            onImageProcessed(index, null);
                            setAnalyzingStates(prev => {
                                const next = [...prev];
                                next[index] = false;
                                return next;
                            });
                            continue;
                        }

                        // テキスト生成と画像生成を並列で行う
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

                        // このアイテムの全処理完了を待つ
                        await Promise.all([textPromise, imagePromise]);
                        console.log(`[AiAnalysis/Batch] Worker ${workerId} finished index ${index}`);
                    }
                });

            await Promise.all(workers);
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

            // Parallel processing with concurrency limit
            const CONCURRENCY_LIMIT = 5;
            console.log(`[AiAnalysis] Starting parallel image processing (Limit: ${CONCURRENCY_LIMIT}). Total files: ${filesToProcess.length}`);

            const queue = filesToProcess.map((file, i) => ({ file, index: getRealIndex(i), loopIndex: i }));
            const workers = Array(Math.min(CONCURRENCY_LIMIT, filesToProcess.length))
                .fill(null)
                .map(async (_, workerId) => {
                    while (queue.length > 0) {
                        const task = queue.shift();
                        if (!task) break;

                        const { file, index } = task;
                        console.log(`[AiAnalysis] Worker ${workerId} starting index ${index} (file: ${file?.name})`);

                        if (!file) {
                            onImageProcessed(index, null);
                            setAnalyzingStates(prev => {
                                const next = [...prev];
                                next[index] = false;
                                return next;
                            });
                            continue;
                        }

                        try {
                            const result = await AiService.editImage(file, backgroundType);

                            if (result.success && result.imageUrl) {
                                console.log(`[AiAnalysis] Image ${index} edit success.`);
                                onImageProcessed(index, result.imageUrl);
                            } else {
                                console.warn(`[AiAnalysis] Image ${index} edit failed/skipped:`, result.error);
                                onImageProcessed(index, null);
                                if (result.error) {
                                    // エラーでも続行
                                    toast.warning(`画像${index + 1}: 背景加工に失敗しました (${result.error})`);
                                }
                            }
                        } catch (error) {
                            console.error(`[AiAnalysis] Image ${index} edit exception:`, error);
                            onImageProcessed(index, null);
                        } finally {
                            setAnalyzingStates(prev => {
                                const next = [...prev];
                                next[index] = false;
                                return next;
                            });
                        }
                    }
                });

            await Promise.all(workers);

            console.log(`[AiAnalysis] All images processed.`);

            setIsEditingImage(false);

            // テキスト生成待ち
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
