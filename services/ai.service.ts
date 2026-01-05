import { AnalyzeResponse, EditImageResponse } from "@/types";

/**
 * AI Service
 * Analyzes images and edits images using the backend API.
 */
export const AiService = {
    /**
     * Analyzes the item image to generate title, description, and price.
     */
    async analyzeItem(imageFile: File, status: string): Promise<AnalyzeResponse> {
        const formData = new FormData();
        formData.append("image", imageFile);
        formData.append("status", status);

        const response = await fetch("/api/analyze", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Analysis failed: ${response.statusText}`);
        }

        return response.json();
    },

    /**
     * Optimizes the item image for Mercari.
     */
    async editImage(imageFile: File): Promise<EditImageResponse> {
        const formData = new FormData();
        formData.append("image", imageFile);

        const response = await fetch("/api/edit-image", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            // 画像編集の失敗は致命的ではない場合が多いが、呼び出し元でハンドリングできるようにエラーを投げる
            // もしくは、呼び出し元で Promise.allSettled を使う前提であればここでエラーを投げても良い
            throw new Error(`Image editing failed: ${response.statusText}`);
        }

        return response.json();
    },
};
