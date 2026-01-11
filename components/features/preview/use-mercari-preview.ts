/**
 * MercariPreview用フック
 *
 * コピーとダウンロード機能を抽出
 */

import { useState, useCallback } from "react";

interface UseMercariPreviewReturn {
    /** コピー済みフィールド */
    copiedField: string | null;
    /** テキストをコピー */
    handleCopy: (text: string, field: string) => void;
    /** 画像をダウンロード */
    handleDownload: (imageUrl: string, fileName: string) => Promise<void>;
}

export function useMercariPreview(): UseMercariPreviewReturn {
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const handleCopy = useCallback((text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    }, []);

    const handleDownload = useCallback(async (imageUrl: string, fileName: string) => {
        if (!imageUrl) return;

        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${fileName || "image"}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download failed:", error);
        }
    }, []);

    return {
        copiedField,
        handleCopy,
        handleDownload,
    };
}
