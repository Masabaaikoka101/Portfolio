/**
 * AI サービス
 *
 * このファイルの役割:
 * - バックエンドAI APIとの通信を抽象化
 * - フロントエンドコンポーネントからAPIの詳細を隠蔽
 *
 * Why サービス層を分離するのか:
 * - 関心の分離: UIロジックとAPI通信を分離
 * - テスタビリティ: モック化が容易
 * - 再利用性: 複数のコンポーネントから同じAPIを呼び出せる
 * - 保守性: APIエンドポイントの変更が1箇所で済む
 *
 * Alternatives:
 * - useSWR / React Query: キャッシュ機能が必要な場合は検討
 *   今回はPOSTリクエストが中心のため、シンプルなfetchを採用
 * - tRPC: 型安全なAPI通信。規模が大きくなったら検討
 *
 * Learning:
 * - Fetch API: https://developer.mozilla.org/ja/docs/Web/API/Fetch_API
 * - FormData: https://developer.mozilla.org/ja/docs/Web/API/FormData
 */

import { AnalyzeResponse, EditImageResponse } from "@/types";

/**
 * AIサービスオブジェクト
 *
 * Why オブジェクトリテラルパターンか:
 * - 名前空間として機能し、関数をグループ化
 * - クラスより軽量で、インスタンス化不要
 * - Tree-shakingが効きやすい
 *
 * Alternatives:
 * - クラス: 状態を持つ場合は有効だが、今回はステートレス
 * - 個別のexport関数: 名前空間がなくなり、import管理が煩雑
 */

/**
 * 画像サイズ制限（バイト）
 * Vercel Serverless Functionの制限(4.5MB)を考慮
 * Base64エンコードで約33%増加するため、1.5MBを上限とする
 */
const MAX_IMAGE_SIZE = 1.5 * 1024 * 1024; // 1.5MB
const MAX_DIMENSION = 1536; // Gemini推奨

/**
 * 画像圧縮ヘルパー（クライアントサイド）
 * 常に寸法をチェックし、必要に応じてリサイズ・圧縮を行う
 */
const compressImage = async (file: File): Promise<File> => {
    // サーバーサイド（Node.js）で実行された場合はそのまま返す
    if (typeof window === "undefined") return file;

    console.log(`[AiService] Processing image: ${file.name}, size: ${file.size} bytes`);

    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            const needsResize = img.width > MAX_DIMENSION || img.height > MAX_DIMENSION;
            const needsCompress = file.size > MAX_IMAGE_SIZE;

            // リサイズも圧縮も不要ならそのまま返す
            if (!needsResize && !needsCompress) {
                console.log(`[AiService] Image OK (${img.width}x${img.height}, ${file.size} bytes)`);
                resolve(file);
                return;
            }

            // リサイズ計算
            let width = img.width;
            let height = img.height;

            if (needsResize) {
                if (width > height) {
                    height = Math.round((height * MAX_DIMENSION) / width);
                    width = MAX_DIMENSION;
                } else {
                    width = Math.round((width * MAX_DIMENSION) / height);
                    height = MAX_DIMENSION;
                }
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
                console.error("[AiService] Failed to get canvas context");
                resolve(file); // フォールバック
                return;
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, width, height);

            // JPEG圧縮（品質0.85）
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        console.error("[AiService] Failed to create blob");
                        resolve(file);
                        return;
                    }
                    const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
                    const compressedFile = new File([blob], newFileName, {
                        type: "image/jpeg",
                        lastModified: Date.now(),
                    });
                    console.log(`[AiService] Compressed: ${img.width}x${img.height} -> ${width}x${height}, ${file.size} -> ${compressedFile.size} bytes`);
                    resolve(compressedFile);
                },
                "image/jpeg",
                0.85
            );
        };

        img.onerror = (error) => {
            URL.revokeObjectURL(url);
            console.warn("[AiService] Failed to load image, using original:", error);
            resolve(file);
        };

        img.src = url;
    });
};

export const AiService = {
    /**
     * 商品画像を解析し、タイトル・説明文・価格を生成
     *
     * Why FormDataを使うのか:
     * - ファイルアップロードにはFormDataが最適
     * - Content-Typeが自動的にmultipart/form-dataになる
     * - サーバー側でreq.formData()で受け取れる
     *
     * エラーハンドリング:
     * - response.okがfalseの場合はErrorをthrow
     * - 呼び出し元でtry-catchまたはPromise.allSettledでハンドリング
     *
     * @param imageFile - アップロードする画像ファイル
     * @param status - 商品の状態（ItemStatus型の値）
     * @returns AI生成結果（タイトル、説明文、価格、タグ、禁止物フラグ）
     * @throws APIエラー時
     */
    async analyzeItem(imageFile: File, status: string): Promise<AnalyzeResponse> {
        // 画像圧縮（必要であれば）
        const processedFile = await compressImage(imageFile);

        const formData = new FormData();
        formData.append("image", processedFile);
        formData.append("status", status);

        const response = await fetch("/api/analyze", {
            method: "POST",
            body: formData,
            // Note: Content-Typeは自動設定されるため、手動で設定しない
            // 手動設定するとboundaryが欠けてエラーになる
        });

        if (!response.ok) {
            throw new Error(`Analysis failed: ${response.statusText}`);
        }

        return response.json();
    },

    /**
     * 商品画像をメルカリ出品用に最適化
     *
     * What this does:
     * - 背景を白抜きにする
     * - 自然な影を追加
     * - ライティングを補正
     *
     * Why 画像編集を分離しているか:
     * - 画像編集は失敗しても出品自体は可能
     * - Promise.allSettledで並列実行し、失敗時はオリジナル画像を使用
     *
     * Note:
     * - 編集失敗時はoriginal画像にフォールバックする設計
     * - 呼び出し元（use-ai-analysis.ts）でハンドリング
     *
     * @param imageFile - アップロードする画像ファイル
     * @param backgroundType - 背景タイプ（white/canvas/dark-wood/light-wood/marble）
     * @returns 編集結果（成功フラグ、編集後画像URL）
     * @throws APIエラー時
     */
    async editImage(imageFile: File, backgroundType: string = "white"): Promise<EditImageResponse> {
        // 画像圧縮（必要であれば）
        const processedFile = await compressImage(imageFile);

        const formData = new FormData();
        formData.append("image", processedFile);
        formData.append("backgroundType", backgroundType);

        const response = await fetch("/api/edit-image", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            let errorDetail = response.statusText;
            try {
                const errorData = await response.json();
                if (errorData.details) {
                    errorDetail = `${errorData.error} - ${errorData.details}`;
                } else if (errorData.error) {
                    errorDetail = errorData.error;
                }
            } catch (e) {
                // ignore
            }
            // エラーをthrowせず、失敗結果として返す
            return {
                success: false,
                imageUrl: undefined,
                error: `Image editing failed: ${errorDetail}`
            };
        }

        return response.json();
    },
};
