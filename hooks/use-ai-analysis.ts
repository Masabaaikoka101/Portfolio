/**
 * AI分析フック
 *
 * このフックの役割:
 * - 商品画像のAI分析プロセスを管理
 * - テキスト生成と画像編集を並列実行
 * - ローディング状態とエラーハンドリングを担当
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { AiService } from "@/services/ai.service";
import { ItemService } from "@/services/item.service";
import { AnalyzeResponse } from "@/types";
import { PARALLEL_IMAGE_PROCESSING } from "@/lib/constants";

interface UseAiAnalysisProps {
    selectedFile: File | null;
    multipleFiles?: File[];
    status: string;
    backgroundType: string;
    onAnalysisSuccess: (result: AnalyzeResponse) => void;
    onImageEditSuccess: (imageUrl: string) => void;
    onImageEditSkip: () => void;
    onMultipleImagesEditSuccess?: (imageUrls: string[]) => void;
}

export function useAiAnalysis({
    selectedFile,
    multipleFiles,
    status,
    backgroundType,
    onAnalysisSuccess,
    onImageEditSuccess,
    onImageEditSkip,
    onMultipleImagesEditSuccess,
}: UseAiAnalysisProps) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isEditingImage, setIsEditingImage] = useState(false);
    const [editProgress, setEditProgress] = useState(0);
    const [editTotal, setEditTotal] = useState(0);

    /**
     * 従来のAI分析（プレビュー画面表示用）
     */
    const startAnalysis = useCallback(async () => {
        if (!selectedFile) return;

        setIsAnalyzing(true);
        setIsEditingImage(true);

        try {
            const [analyzeResult, editResult] = await Promise.allSettled([
                AiService.analyzeItem(selectedFile, status),
                AiService.editImage(selectedFile, backgroundType),
            ]);

            if (analyzeResult.status === "fulfilled") {
                onAnalysisSuccess(analyzeResult.value);
            } else {
                toast.error("テキスト生成に失敗しました");
                console.error("Analysis failed:", analyzeResult.reason);
            }

            setIsAnalyzing(false);

            if (editResult.status === "fulfilled" && editResult.value.success && editResult.value.imageUrl) {
                onImageEditSuccess(editResult.value.imageUrl);
            } else {
                if (editResult.status === "rejected") {
                    console.error("Image editing failed:", editResult.reason);
                }
                onImageEditSkip();
                toast.info("AI画像編集はスキップされました");
            }

        } catch (error) {
            console.error("Unexpected error during analysis:", error);
            toast.error("分析中にエラーが発生しました");
            setIsAnalyzing(false);
        } finally {
            setIsEditingImage(false);
        }
    }, [selectedFile, status, backgroundType, onAnalysisSuccess, onImageEditSuccess, onImageEditSkip]);

    /**
     * リアルタイム生成（DBに直接更新しながら処理）
     *
     * 処理フロー（品質優先版）:
     * 1. ユーザー取得
     * 2. 全ての画像を先行アップロード（オリジナル画像として）
     * 3. pending状態のアイテムを作成（1枚目の画像URLを含む）
     * 4. item_imagesテーブルに全オリジナル画像を保存
     * 5. 詳細ページへ遷移（この時点で全画像が表示可能）
     * 6. テキスト生成（バックグラウンド）
     * 7. 画像のAI編集（バックグラウンド、編集後のURLでDBを更新）
     * 8. 完了
     */
    const startRealtimeAnalysis = useCallback(async (
        files: File[],
        onItemCreated: (itemId: string) => void
    ) => {
        if (files.length === 0) return;

        setIsAnalyzing(true);
        setIsEditingImage(true);

        try {
            // 1. ユーザー取得
            const user = await ItemService.getCurrentUser();
            if (!user) {
                toast.error("ログインが必要です");
                return;
            }

            // 2. 全ての画像を先行アップロード（オリジナル画像として）
            const originalImageUrls: string[] = [];
            for (let i = 0; i < files.length; i++) {
                const imageUrl = await ItemService.uploadImage(files[i], user.id);
                originalImageUrls.push(imageUrl);
            }

            // 3. pending状態のアイテムを作成（1枚目の画像URLを含む）
            const itemId = await ItemService.createPendingItem(user.id, status, originalImageUrls[0]);

            // 4. item_imagesテーブルに全オリジナル画像を保存
            await ItemService.saveItemImages(itemId, originalImageUrls);

            // 5. 詳細ページへ遷移（この時点で全画像が表示可能）
            onItemCreated(itemId);

            // 6. テキスト生成開始（バックグラウンド処理）
            await ItemService.updateItem(itemId, { processing_status: "processing_text" });

            try {
                const analyzeResult = await AiService.analyzeItem(files[0], status);

                // タイトル・説明・価格をDBに更新
                await ItemService.updateItem(itemId, {
                    title: analyzeResult.title,
                    description: analyzeResult.description,
                    price: analyzeResult.price,
                    tags: analyzeResult.tags,
                });

                setIsAnalyzing(false);
            } catch (error) {
                console.error("Text analysis failed:", error);
                await ItemService.updateItem(itemId, { processing_status: "failed" });
                toast.error("テキスト生成に失敗しました");
                return;
            }

            // 7. 画像のAI編集（バックグラウンド処理）
            await ItemService.updateItem(itemId, { processing_status: "processing_images" });
            setEditProgress(0);
            setEditTotal(files.length);

            if (PARALLEL_IMAGE_PROCESSING) {
                // ========================================
                // 並列処理モード（高速だがレート制限に注意）
                // ========================================
                const editPromises = files.map(async (file, i) => {
                    try {
                        const editResult = await AiService.editImage(file, backgroundType);

                        if (editResult.success && editResult.imageUrl) {
                            const response = await fetch(editResult.imageUrl);
                            const blob = await response.blob();
                            const editedImageUrl = await ItemService.uploadImage(blob, user.id);

                            // items.image_urlを更新（メイン画像のみ）
                            if (i === 0) {
                                await ItemService.updateItem(itemId, { image_url: editedImageUrl });
                            }

                            // item_imagesテーブルの該当画像を更新
                            await ItemService.updateItemImage(itemId, i, editedImageUrl);
                        }
                    } catch (error) {
                        console.error(`Image ${i + 1} processing failed:`, error);
                    }
                });

                // 全画像の処理を同時に実行
                await Promise.all(editPromises);
                setEditProgress(files.length);
            } else {
                // ========================================
                // 順次処理モード（安全だが低速）
                // ========================================
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];

                    try {
                        // 画像編集（AI背景生成）
                        const editResult = await AiService.editImage(file, backgroundType);

                        if (editResult.success && editResult.imageUrl) {
                            // Base64をBlobに変換してアップロード
                            const response = await fetch(editResult.imageUrl);
                            const blob = await response.blob();
                            const editedImageUrl = await ItemService.uploadImage(blob, user.id);

                            // items.image_urlを更新（メイン画像のみ）
                            if (i === 0) {
                                await ItemService.updateItem(itemId, { image_url: editedImageUrl });
                            }

                            // item_imagesテーブルの該当画像を更新
                            await ItemService.updateItemImage(itemId, i, editedImageUrl);
                        }
                        // 編集失敗時はオリジナル画像がそのまま使われるので何もしない

                    } catch (error) {
                        console.error(`Image ${i + 1} processing failed:`, error);
                        // エラー時もオリジナル画像がそのまま使われるので何もしない
                    }

                    setEditProgress(i + 1);
                }
            }

            // 8. 完了
            await ItemService.updateItem(itemId, { processing_status: "completed" });
            toast.success("生成が完了しました！");

        } catch (error) {
            console.error("Realtime analysis failed:", error);
            toast.error("生成中にエラーが発生しました");
        } finally {
            setIsAnalyzing(false);
            setIsEditingImage(false);
            setEditProgress(0);
            setEditTotal(0);
        }
    }, [status, backgroundType]);

    /**
     * 複数画像の一括編集
     */
    const startBatchImageEdit = useCallback(async (files: File[]) => {
        if (files.length === 0) return;

        setIsEditingImage(true);
        setEditProgress(0);
        setEditTotal(files.length);

        const results: string[] = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                try {
                    const result = await AiService.editImage(file, backgroundType);

                    if (result.success && result.imageUrl) {
                        results.push(result.imageUrl);
                    } else {
                        results.push(URL.createObjectURL(file));
                        toast.info(`画像${i + 1}の編集をスキップしました`);
                    }
                } catch (error) {
                    console.error(`Image ${i + 1} edit failed:`, error);
                    results.push(URL.createObjectURL(file));
                }

                setEditProgress(i + 1);
            }

            if (onMultipleImagesEditSuccess) {
                onMultipleImagesEditSuccess(results);
            }

            if (results.length === files.length) {
                toast.success(`${files.length}枚の画像を加工しました`);
            }

        } catch (error) {
            console.error("Batch image edit failed:", error);
            toast.error("一括画像編集中にエラーが発生しました");
        } finally {
            setIsEditingImage(false);
            setEditProgress(0);
            setEditTotal(0);
        }
    }, [backgroundType, onMultipleImagesEditSuccess]);

    return {
        isAnalyzing,
        isEditingImage,
        editProgress,
        editTotal,
        startAnalysis,
        startBatchImageEdit,
        startRealtimeAnalysis,
    };
}
