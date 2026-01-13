"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { toast } from "sonner";
import { AiService } from "@/services/ai.service";
import { supabase } from "@/lib/supabase";
import { BatchItem, ItemStatus } from "@/types";
// import { uploadImage } from "@/utils/image-upload"; // 存在しないため削除

/**
 * バッチジョブのコンテキスト型定義
 */
interface BatchJobContextType {
    isProcessing: boolean;
    progress: number;
    total: number;
    startBatchJob: (
        files: File[],
        batchItems: BatchItem[]
    ) => Promise<void>;
}

const BatchJobContext = createContext<BatchJobContextType | undefined>(undefined);

export function BatchJobProvider({ children }: { children: ReactNode }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [total, setTotal] = useState(0);

    // const supabase = createClient();

    // 単一アイテムの処理関数
    const processItem = async (file: File, settings: BatchItem, index: number) => {
        try {
            // 1. AI分析 (テキスト)
            const textPromise = AiService.analyzeItem(file, settings.status)
                .catch(err => {
                    console.error(`[Item ${index}] Text analysis failed:`, err);
                    return null;
                });

            // 2. AI画像編集
            const imagePromise = AiService.editImage(file, settings.backgroundType)
                .catch(err => {
                    console.error(`[Item ${index}] Image edit failed:`, err);
                    return null;
                });

            // 並列実行
            const [textResult, imageResult] = await Promise.all([textPromise, imagePromise]);

            // 3. 画像アップロード (オリジナル)
            // ファイル名から日本語などを除外してサニタイズ
            const ext = file.name.split('.').pop() || "jpg";
            const sanitizedFileName = `${Date.now()}_original_${index}.${ext}`;
            const originalPath = `items/${sanitizedFileName}`;

            const { error: uploadError } = await supabase.storage
                .from("item-images")
                .upload(originalPath, file);

            if (uploadError) throw uploadError;
            const { data: { publicUrl: originalUrl } } = supabase.storage
                .from("item-images")
                .getPublicUrl(originalPath);

            // 4. 画像アップロード (加工後) - Base64の場合
            let processedUrl = originalUrl;
            if (imageResult?.success && imageResult.imageUrl) {
                // Base64 or URL check
                if (imageResult.imageUrl.startsWith("data:")) {
                    const blob = await (await fetch(imageResult.imageUrl)).blob();
                    const processedPath = `items/${Date.now()}_processed_${index}.png`;
                    const { error: procUploadError } = await supabase.storage
                        .from("item-images")
                        .upload(processedPath, blob);

                    if (!procUploadError) {
                        const { data: { publicUrl } } = supabase.storage
                            .from("item-images")
                            .getPublicUrl(processedPath);
                        processedUrl = publicUrl;
                    }
                } else {
                    processedUrl = imageResult.imageUrl;
                }
            }

            // 5. DB保存
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("ユーザー認証されていません。再度ログインしてください。");

            console.log(`[Item ${index}] Inserting item for user:`, user.id, "Status:", settings.status);

            const { error: dbError } = await supabase.from("items").insert({
                title: textResult?.title || "",
                description: textResult?.description || "",
                price: textResult?.price || 0,
                status: settings.status,
                image_url: processedUrl,       // schemaに合わせて修正: images -> image_url
                user_id: user.id,
            });

            if (dbError) throw dbError;

            return true;

        } catch (error) {
            console.error(`[Item ${index}] Processing failed:`, error);
            // エラーの詳細を表示
            let message = "処理に失敗しました";
            const errorMessage = (error as any)?.message || (typeof error === "string" ? error : "");

            if (errorMessage) {
                if (errorMessage.includes("Analysis")) message = "商品情報の解析に失敗しました";
                else if (errorMessage.includes("Image editing")) message = "画像の加工に失敗しました（オリジナルを保存します）";
                else if (errorMessage.includes("storage")) message = "画像のアップロードに失敗しました";
                else if (errorMessage.includes("items")) message = `データベースへの保存に失敗しました: ${errorMessage}`;
                else message = `エラー: ${errorMessage}`;
            }
            toast.error(`商品 ${index + 1}: ${message}`);
            return false;
        }
    };

    const startBatchJob = useCallback(async (files: File[], batchItems: BatchItem[]) => {
        if (files.length === 0) return;

        setIsProcessing(true);
        setTotal(files.length);
        setProgress(0);

        const toastId = toast.loading(`一括生成中... (0/${files.length})`);

        try {
            // 順次処理ではなく並列処理するが、サーバー負荷を考慮してある程度制御してもよい
            // 今回はシンプルに Promise.all で並列実行

            let completedCount = 0;

            const promises = files.map(async (file, index) => {
                const settings = batchItems[index] || batchItems[0]; // 設定がなければ最初(またはデフォルト)を使う
                const success = await processItem(file, settings, index);

                completedCount++;
                setProgress(completedCount);
                toast.loading(`一括生成中... (${completedCount}/${files.length})`, { id: toastId });

                return success;
            });

            await Promise.all(promises);

            toast.success("すべての一括生成が完了しました", { id: toastId });

        } catch (error) {
            console.error("Batch Job Failed:", error);
            toast.error("一括生成中にエラーが発生しました", { id: toastId });
        } finally {
            setIsProcessing(false);
            setProgress(0);
            setTotal(0);
        }
    }, []);

    return (
        <BatchJobContext.Provider value={{ isProcessing, progress, total, startBatchJob }}>
            {children}
        </BatchJobContext.Provider>
    );
}

export function useBatchJob() {
    const context = useContext(BatchJobContext);
    if (context === undefined) {
        throw new Error("useBatchJob must be used within a BatchJobProvider");
    }
    return context;
}
