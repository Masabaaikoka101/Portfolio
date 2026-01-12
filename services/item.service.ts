/**
 * 商品（Item）サービス
 *
 * このファイルの役割:
 * - Supabase（データベース・ストレージ）とのやり取りを抽象化
 * - 商品データの永続化ロジックを集約
 *
 * Why サービス層を分離するのか:
 * - 関心の分離: UIロジックとデータ永続化を分離
 * - テスタビリティ: Supabaseをモック化してテスト可能
 * - 再利用性: 複数のコンポーネント・フックから呼び出せる
 * - 保守性: DBスキーマ変更時の影響範囲を限定
 *
 * Alternatives:
 * - Prisma: 型安全なORM。サーバーサイドのみの場合は有力候補
 * - Drizzle: 軽量なTypeScript ORM。Supabaseとの相性も良い
 * - SupabaseのRPC: 複雑な処理はPostgreSQL関数に寄せる方法
 *
 * Learning:
 * - Supabase JavaScript Client: https://supabase.com/docs/reference/javascript
 * - Supabase Storage: https://supabase.com/docs/guides/storage
 */

import { supabase } from "@/lib/supabase";
import { DEFAULTS } from "@/lib/constants";
import { ItemFormState } from "@/types";

/**
 * 商品サービスオブジェクト
 *
 * Why オブジェクトリテラルパターンか:
 * - AiServiceと同様、名前空間として機能
 * - ステートレスな操作のみのため、クラスは不要
 */
export const ItemService = {
    /**
     * 画像をSupabase Storageにアップロード
     *
     * ファイル命名規則:
     * - `{userId}/{timestamp}.png` の形式
     * - ユーザーごとにディレクトリを分けることで管理しやすく
     * - タイムスタンプで一意性を担保
     *
     * Why Supabase Storageを使うのか:
     * - 認証・RLSと統合されている
     * - CDN配信が自動で有効
     * - 無料枠が十分（1GB）
     *
     * Alternatives:
     * - Cloudinary: 画像変換機能が豊富だが、別サービス管理が必要
     * - AWS S3: 設定が複雑、個人開発にはオーバースペック
     * - Vercel Blob: Next.jsとの相性は良いが、Supabaseとの統合度が低い
     *
     * @param fileBlob - アップロードするファイル（Blob形式）
     * @param userId - ユーザーID（ディレクトリ名に使用）
     * @returns アップロード後の公開URL
     * @throws アップロードエラー時
     */
    async uploadImage(fileBlob: Blob, userId: string): Promise<string> {
        const fileName = `${userId}/${Date.now()}.png`;

        const { error: uploadError } = await supabase.storage
            .from("item-images")
            .upload(fileName, fileBlob, { contentType: "image/png" });

        if (uploadError) {
            throw new Error(`Image upload failed: ${uploadError.message}`);
        }

        // アップロード後に公開URLを取得
        const { data: { publicUrl } } = supabase.storage
            .from("item-images")
            .getPublicUrl(fileName);

        return publicUrl;
    },

    /**
     * 商品をSupabase Databaseに保存
     *
     * Why トランザクションを使わないのか:
     * - 現状は単一のinsertのみで、アトミック性が保証されている
     * - 画像アップロードとDB保存は別トランザクション
     *   → 画像アップロード成功 → DB保存失敗の場合、孤立画像が残る
     *   → 将来的にはクリーンアップバッチを検討
     *
     * Note:
     * - RLS（Row Level Security）により、自分のデータのみ操作可能
     * - user_idはauth.uid()と照合される
     *
     * @param userId - ユーザーID
     * @param imageUrl - アップロード済み画像のURL
     * @param formState - フォーム入力値
     * @param tags - ハッシュタグ配列（オプション）
     * @throws DB保存エラー時
     */
    async saveItem(
        userId: string,
        imageUrl: string,
        formState: ItemFormState,
        tags: string[] = []
    ): Promise<void> {
        // まずはother_imagesを含めて保存を試みる
        const fullData = {
            user_id: userId,
            image_url: imageUrl,
            other_images: formState.other_images ?? [],
            title: formState.title,
            description: formState.description,
            price: formState.price,
            status: formState.status,
            category: DEFAULTS.category,
            tags: tags,
        };

        const { error: dbError } = await supabase.from("items").insert(fullData);

        if (dbError) {
            // other_imagesカラムが存在しない場合はフォールバック
            if (dbError.message.includes("other_images")) {
                console.warn("other_images column not found. Saving without it...");
                const fallbackData = {
                    user_id: userId,
                    image_url: imageUrl,
                    title: formState.title,
                    description: formState.description,
                    price: formState.price,
                    status: formState.status,
                    category: DEFAULTS.category,
                    tags: tags,
                };
                const { error: fallbackError } = await supabase.from("items").insert(fallbackData);
                if (fallbackError) {
                    throw new Error(`Database save failed: ${fallbackError.message}`);
                }
                return;
            }
            throw new Error(`Database save failed: ${dbError.message}`);
        }
    },

    /**
     * 現在の認証済みユーザーを取得
     *
     * Why getUser()を使うのか:
     * - getSession()よりセキュア（サーバーサイドで検証）
     * - JWTの有効期限切れも自動的にハンドリング
     *
     * Note:
     * - 未認証の場合、userはnullになる
     * - エラーは呼び出し元でハンドリング
     *
     * @returns 認証済みユーザー、または null
     * @throws 認証エラー時
     */
    async getCurrentUser() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    }
};
