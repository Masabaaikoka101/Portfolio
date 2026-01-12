import { useState, useCallback } from "react";

/**
 * 画像アップロード管理フック
 *
 * Why 配列で管理するのか:
 * - 複数画像（最大3枚）のアップロードに対応するため
 * - originalImages[i] と processedImages[i] をインデックスで対応付け
 *
 * @returns 画像状態と操作関数
 */
export function useImageUpload() {
    /**
     * オリジナル画像リスト（Base64 Data URL）
     */
    const [originalImages, setOriginalImages] = useState<string[]>([]);

    /**
     * 処理済み画像リスト
     *
     * Note:
     * - originalImagesと同じ長さの配列
     * - まだ処理されていない、または処理失敗等の場合は null が入る可能性あり
     * - UI側で originalImages[i] があるのに processedImages[i] が null なら「処理中」とみなす等の制御が可能
     */
    const [processedImages, setProcessedImages] = useState<(string | null)[]>([]);

    /**
     * 選択されたファイルリスト
     */
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    /**
     * 画像選択ハンドラー（複数対応）
     *
     * What this does:
     * - 選択されたファイルをBase64に変換
     * - 最大3枚までに制限
     * - 既存の状態をリセットして置き換え
     * 
     * Note: 
     * - ブラウザ/OSによっては選択順と逆順でファイルが返される場合がある
     * - そのため配列を反転して、最初に選択したファイルがメイン画像となるよう調整
     */
    const handleFilesSelect = useCallback((files: File[]) => {
        if (files.length === 0) return;

        // 最大3枚まで、かつ反転して選択順序を維持
        // Note: 一部ブラウザでは選択順と逆にファイルが返されるため反転
        const targetFiles = files.slice(0, 3).reverse();

        // ファイル読み込み（並列実行だが、Promise.allは順序を維持）
        const promises = targetFiles.map((file, index) => {
            return new Promise<{ index: number; image: string }>((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    resolve({ index, image: e.target?.result as string });
                };
                reader.readAsDataURL(file);
            });
        });

        Promise.all(promises).then((results) => {
            // インデックス順にソートして画像を取り出す
            const sortedResults = results.sort((a, b) => a.index - b.index);
            const images = sortedResults.map((r) => r.image);

            setOriginalImages(images);
            setProcessedImages(new Array(images.length).fill(null));
            setSelectedFiles(targetFiles);
        });
    }, []);

    /**
     * 画像リセット
     */
    const resetImage = useCallback(() => {
        setOriginalImages([]);
        setProcessedImages([]);
        setSelectedFiles([]);
    }, []);

    /**
     * 画像の並び順を変更（スワップ）
     * @param fromIndex 移動元のインデックス
     * @param toIndex 移動先のインデックス
     */
    const moveImage = useCallback((fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return;

        setOriginalImages((prev) => {
            const next = [...prev];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            return next;
        });

        setProcessedImages((prev) => {
            const next = [...prev];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            return next;
        });

        setSelectedFiles((prev) => {
            const next = [...prev];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            return next;
        });
    }, []);

    /**
     * 画像の並び順を一括変更
     * @param newIndices 新しい並び順のインデックス配列 (例: [2, 0, 1])
     */
    const reorderImages = useCallback((newIndices: number[]) => {
        setOriginalImages((prev) => newIndices.map(i => prev[i]));
        setProcessedImages((prev) => newIndices.map(i => prev[i]));
        setSelectedFiles((prev) => newIndices.map(i => prev[i]));
    }, []);

    return {
        // 状態
        originalImages,
        processedImages,
        setProcessedImages, // 外部から更新用（AI処理完了時など）
        selectedFiles,

        // アクション
        handleFilesSelect,
        resetImage,
        moveImage,
        reorderImages,
    };
}
