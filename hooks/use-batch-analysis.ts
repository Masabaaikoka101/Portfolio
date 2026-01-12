import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Item, ItemStatus } from "@/types";

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

        try {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];

                // 1. 画像取得
                setCurrentStep(`${i + 1}/${items.length}: [1/4] 画像を取得中...`);
                const response = await fetch(item.image_url);
                if (!response.ok) throw new Error(`画像の取得に失敗しました: ${item.title}`);
                const blob = await response.blob();
                const file = new File([blob], "image.jpg", { type: blob.type });

                // 2. 画像加工 (背景除去)
                setCurrentStep(`${i + 1}/${items.length}: [2/4] AI背景除去中...`);
                // FormData作成
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
                    console.warn("背景除去失敗、元画像を使用します", e); // eslint-disable-next-line no-console
                    // フォールバック: 元画像をbase64化
                    const reader = new FileReader();
                    processedImageBase64 = await new Promise((resolve) => {
                        reader.onload = () => resolve(reader.result as string);
                        reader.readAsDataURL(file);
                    });
                }

                // 3. Gemini分析
                setCurrentStep(`${i + 1}/${items.length}: [3/4] Gemini分析中...`);
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
                setCurrentStep(`${i + 1}/${items.length}: [4/4] 保存中...`);

                // base64からBlobを作成してアップロード
                // DataURL ("data:image/png;base64,....") 前提
                const base64Data = processedImageBase64.split(",")[1] || processedImageBase64;
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let k = 0; k < byteCharacters.length; k++) {
                    byteNumbers[k] = byteCharacters.charCodeAt(k);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const processedBlob = new Blob([byteArray], { type: "image/png" });
                const processedFile = new File([processedBlob], `processed-${Date.now()}.png`, { type: "image/png" });

                const fileName = `batch-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
                const { error: uploadError } = await supabase.storage
                    .from("items")
                    .upload(fileName, processedFile);

                if (uploadError) throw uploadError;

                const { data: UrlData } = supabase.storage.from("items").getPublicUrl(fileName);
                const publicUrl = UrlData.publicUrl;

                // ユーザーIDの取得 (Client Componentなのでセッションから)
                const { data: { session } } = await supabase.auth.getSession();
                const userId = session?.user?.id;

                if (!userId) throw new Error("ユーザー認証が見つかりません");

                // DB Insert
                const { error: insertError } = await supabase.from("items").insert({
                    user_id: userId,
                    title: title || item.title, // 生成失敗時は元のタイトル
                    description: description || item.description,
                    price: price || item.price,
                    status: item.status,
                    image_url: publicUrl,
                    original_image_url: item.image_url, // 元画像のURLも保存しておく
                });

                if (insertError) throw insertError;

                successCount++;
                setProgress(((i + 1) / items.length) * 100);
            }
        } catch (error) {
            console.error(error); // eslint-disable-next-line no-console
            alert("処理中にエラーが発生しました: " + (error instanceof Error ? error.message : "不明なエラー"));
        } finally {
            setIsProcessing(false);
            setCurrentStep("");
        }

        return successCount;
    };

    return { isProcessing, progress, currentStep, processBatch };
}
