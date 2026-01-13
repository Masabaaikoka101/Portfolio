import { useState, useCallback } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import type { Item } from "@/types";

interface UseBulkDownloadReturn {
    isDownloading: boolean;
    downloadItems: (items: Item[]) => Promise<void>;
}

export function useBulkDownload(): UseBulkDownloadReturn {
    const [isDownloading, setIsDownloading] = useState(false);

    const downloadItems = useCallback(async (items: Item[]) => {
        if (!items || items.length === 0) {
            toast.error("ダウンロードする商品が選択されていません");
            return;
        }

        setIsDownloading(true);
        const toastId = toast.loading(`${items.length}件の商品の画像を準備中...`);

        try {
            const zip = new JSZip();
            const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
            const rootFolder = zip.folder(`Mercari_Batch_${dateStr}`);

            if (!rootFolder) throw new Error("ZIPフォルダの作成に失敗しました");

            // 各アイテムを処理
            const itemPromises = items.map(async (item) => {
                // フォルダ名: 商品名_ID (ファイルシステムで使用できない文字は置換)
                const safeTitle = (item.title || "Untitled").replace(/[\\/:*?"<>|]/g, "_");
                const folderName = `${safeTitle}_${item.id.slice(0, 8)}`;
                const itemFolder = rootFolder.folder(folderName);

                if (!itemFolder) return;

                // ダウンロード対象の画像URLリストを作成
                const imageUrls = [item.image_url, ...(item.other_images || [])].filter(Boolean);

                // 各画像をフェッチしてフォルダに追加
                const imagePromises = imageUrls.map(async (url, index) => {
                    try {
                        const response = await fetch(url);
                        if (!response.ok) throw new Error(`Failed to fetch ${url}`);
                        const blob = await response.blob();

                        // ファイル名: 01_main.png, 02_other.png, ...
                        // 拡張子はblobから推測するか、デフォルトpngとする
                        const ext = blob.type.split('/')[1] || "png";
                        const fileName = index === 0
                            ? `01_main.${ext}`
                            : `${String(index + 1).padStart(2, '0')}_sub.${ext}`;

                        itemFolder.file(fileName, blob);
                    } catch (err) {
                        console.error(`Failed to download image for item ${item.id}:`, err);
                        // 個別の画像失敗は全体を止めないが、ログには残す
                    }
                });

                await Promise.all(imagePromises);
            });

            await Promise.all(itemPromises);

            // ZIP生成と保存
            toast.loading("ZIPファイルを作成中...", { id: toastId });
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `Mercari_Batch_${dateStr}.zip`);

            toast.success("ダウンロードが完了しました", { id: toastId });

        } catch (error) {
            console.error("Batch download failed:", error);
            toast.error("ダウンロードに失敗しました", { id: toastId });
        } finally {
            setIsDownloading(false);
        }
    }, []);

    return {
        isDownloading,
        downloadItems,
    };
}
