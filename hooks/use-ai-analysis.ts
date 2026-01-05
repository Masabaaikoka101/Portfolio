import { useState, useCallback } from "react";
import { toast } from "sonner";
import { AiService } from "@/services/ai.service";
import { AnalyzeResponse } from "@/types";

interface UseAiAnalysisProps {
    selectedFile: File | null;
    status: string;
    onAnalysisSuccess: (result: AnalyzeResponse) => void;
    onImageEditSuccess: (imageUrl: string) => void;
    onImageEditSkip: () => void;
}

/**
 * Hook for managing AI analysis process.
 */
export function useAiAnalysis({
    selectedFile,
    status,
    onAnalysisSuccess,
    onImageEditSuccess,
    onImageEditSkip,
}: UseAiAnalysisProps) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isEditingImage, setIsEditingImage] = useState(false);

    const startAnalysis = useCallback(async () => {
        if (!selectedFile) return;

        setIsAnalyzing(true);
        setIsEditingImage(true);

        try {
            const [analyzeResult, editResult] = await Promise.allSettled([
                AiService.analyzeItem(selectedFile, status),
                AiService.editImage(selectedFile),
            ]);

            // Handle Analysis Result
            if (analyzeResult.status === "fulfilled") {
                onAnalysisSuccess(analyzeResult.value);
            } else {
                toast.error("テキスト生成に失敗しました");
                console.error("Analysis failed:", analyzeResult.reason);
            }

            setIsAnalyzing(false);

            // Handle Image Edit Result
            if (editResult.status === "fulfilled" && editResult.value.success && editResult.value.imageUrl) {
                onImageEditSuccess(editResult.value.imageUrl);
            } else {
                // If editing failed or was not successful, we use the original (skipped)
                if (editResult.status === "rejected") {
                    console.error("Image editing failed:", editResult.reason);
                }
                onImageEditSkip();
                toast.info("AI画像編集はスキップされました");
            }

        } catch (error) {
            console.error("Unexpected error duration analysis:", error);
            toast.error("分析中にエラーが発生しました");
            setIsAnalyzing(false);
        } finally {
            setIsEditingImage(false);
        }
    }, [selectedFile, status, onAnalysisSuccess, onImageEditSuccess, onImageEditSkip]);

    return {
        isAnalyzing,
        isEditingImage,
        startAnalysis,
    };
}
