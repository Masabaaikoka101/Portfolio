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
        const formData = new FormData();
        formData.append("image", imageFile);
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
     * @returns 編集結果（成功フラグ、編集後画像URL）
     * @throws APIエラー時
     */
    async editImage(imageFile: File): Promise<EditImageResponse> {
        const formData = new FormData();
        formData.append("image", imageFile);

        const response = await fetch("/api/edit-image", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            // 画像編集の失敗は致命的ではない
            // 呼び出し元でPromise.allSettledを使う前提でエラーをthrow
            throw new Error(`Image editing failed: ${response.statusText}`);
        }

        return response.json();
    },
};
