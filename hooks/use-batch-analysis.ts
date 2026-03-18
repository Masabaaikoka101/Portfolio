import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Item } from "@/types";

interface UseBatchAnalysisResult {
    isProcessing: boolean;
    progress: number;
    currentStep: string;
    processBatch: (items: Item[]) => Promise<number>;
}

export function useBatchAnalysis(): UseBatchAnalysisResult {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0); // 0 to 100
    const [currentStep, setCurrentStep] = useState("");

    const processBatch = async (items: Item[]) => {
        setIsProcessing(true);
        setProgress(0);

        let successCount = 0;

        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        const processSingleItem = async (item: Item, index: number): Promise<boolean> => {
            try {
                // 1. 画像取得
                const response = await fetch(item.image_url);
                if (!response.ok) throw new Error(`画像の取得に失敗しました: ${item.title}`);
                const blob = await response.blob();
                const file = new File([blob], "image.jpg", { type: blob.type });

                // 2. 画像加工 (背景除去)
                const formData = new FormData();
                formData.append("file", file);
                formData.append("mode", "remove-bg");

                let processedImageBase64 = "";

                try {
                    const editRes = await fetch("/api/edit-image", {
                        method: "POST",
                        body: formData,
                    });

                    if (editRes.ok) {
                        const data = await editRes.json();
                        processedImageBase64 = data.image; // base64
                    } else {
                        throw new Error("背景除去に失敗しました");
                    }
                } catch (e) {
                    console.warn(`Item ${index + 1}: 背景除去失敗、元画像を使用します`, e);
                    const reader = new FileReader();
                    processedImageBase64 = await new Promise((resolve) => {
                        reader.onload = () => resolve(reader.result as string);
                        reader.readAsDataURL(file);
                    });
                }

                // 3. Gemini分析
                const analyzeRes = await fetch("/api/analyze", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        image: processedImageBase64,
                        status: item.status || "目立った傷や汚れなし",
                    }),
                });

                if (!analyzeRes.ok) throw new Error("AI分析に失敗しました");
                const { title, description, price } = await analyzeRes.json();

                // 4. 保存
                const base64Data = processedImageBase64.split(",")[1] || processedImageBase64;
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let k = 0; k < byteCharacters.length; k++) {
                    byteNumbers[k] = byteCharacters.charCodeAt(k);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const processedBlob = new Blob([byteArray], { type: "image/png" });
                const processedFile = new File([processedBlob], `processed-${Date.now()}-${index}.png`, { type: "image/png" });

                const fileName = `batch-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
                const { error: uploadError } = await supabase.storage
                    .from("item-images")
                    .upload(fileName, processedFile);

                if (uploadError) throw uploadError;

                const { data: UrlData } = supabase.storage.from("item-images").getPublicUrl(fileName);
                const publicUrl = UrlData.publicUrl;

                const { data: { session } } = await supabase.auth.getSession();
                const userId = session?.user?.id;

                if (!userId) throw new Error("ユーザー認証が見つかりません");

                const { error: insertError } = await supabase.from("items").insert({
                    user_id: userId,
                    title: title || item.title,
                    description: description || item.description,
                    price: price || item.price,
                    status: item.status,
                    image_url: publicUrl,
                    original_image_url: item.image_url,
                });

                if (insertError) throw insertError;

                return true;
            } catch (error) {
                console.error(`Item ${index + 1} failed:`, error);
                return false;
            }
        };

        try {
            const concurrency = 4; // 同時処理数
            let processedCount = 0;

            for (let i = 0; i < items.length; i += concurrency) {
                const chunk = items.slice(i, i + concurrency);
                const endIndex = Math.min(i + concurrency, items.length);

                // 並行処理中の進捗表示
                setCurrentStep(`全${items.length}件中、${i + 1}〜${endIndex}件目をAI並列処理中...`);

                // チャンク内のアイテムを並列して実行
                const results = await Promise.allSettled(
                    chunk.map((item, idx) => processSingleItem(item, i + idx))
                );

                // 成功したものをカウント
                results.forEach((result) => {
                    if (result.status === 'fulfilled' && result.value === true) {
                        successCount++;
                    }
                });

                processedCount += chunk.length;
                setProgress((processedCount / items.length) * 100);

                // APIのレートリミットを回避するため、最後のチャンク以外は待機時間を設ける
                if (endIndex < items.length) {
                    setCurrentStep(`API制限回避のため一時待機中... (残り${items.length - endIndex}件)`);
                    await sleep(3000); // 3秒待機
                }
            }
        } catch (error) {
            console.error(error);
            alert("処理中にエラーが発生しました: " + (error instanceof Error ? error.message : "不明なエラー"));
        } finally {
            setIsProcessing(false);
            setCurrentStep("");
        }

        return successCount;
    };

    return { isProcessing, progress, currentStep, processBatch };
}
