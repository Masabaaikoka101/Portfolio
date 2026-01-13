/**
 * MercariPreview用フック
 *
 * コピーとダウンロード機能を抽出
 */

import { useState, useCallback } from "react";

import JSZip from "jszip";
import { saveAs } from "file-saver";

interface UseMercariPreviewReturn {
    /** コピー済みフィールド */
    copiedField: string | null;
    /** テキストをコピー */
    handleCopy: (text: string, field: string) => void;
    /** 画像をダウンロード */
    handleDownload: (imageUrl: string, fileName: string) => Promise<void>;
    /** 全画像をZIPでダウンロード */
    handleDownloadAll: (imageUrls: string[], fileName: string) => Promise<void>;
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

    const handleDownloadAll = useCallback(async (imageUrls: string[], fileName: string) => {
        if (!imageUrls || imageUrls.length === 0) return;

        try {
            const zip = new JSZip();
            const folder = zip.folder(fileName || "images");

            const promises = imageUrls.map(async (url, index) => {
                if (!url) return;
                const response = await fetch(url);
                const blob = await response.blob();
                // ファイル名: 1枚目.png, 2枚目.png ... または連番
                folder?.file(`${index + 1}.png`, blob);
            });

            await Promise.all(promises);

            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `${fileName || "images"}.zip`);

        } catch (error) {
            console.error("Batch download failed:", error);
        }
    }, []);

    return {
        copiedField,
        handleCopy,
        handleDownload,
        handleDownloadAll,
    };
}
