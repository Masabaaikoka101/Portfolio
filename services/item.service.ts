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
        const { error: dbError } = await supabase.from("items").insert({
            user_id: userId,
            image_url: imageUrl,
            title: formState.title,
            description: formState.description,
            price: formState.price,
            status: formState.status,
            category: DEFAULTS.category,
            tags: tags,
        });

        if (dbError) {
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
    },

    /**
     * 商品を複数画像とともに保存
     *
     * 処理フロー:
     * 1. itemsテーブルに商品を保存（メイン画像URLを含む）
     * 2. item_imagesテーブルに全画像を保存
     *
     * @param userId - ユーザーID
     * @param mainImageUrl - メイン画像のURL
     * @param additionalImageUrls - 追加画像のURL配列
     * @param formState - フォーム入力値
     * @param tags - ハッシュタグ配列（オプション）
     * @returns 保存した商品のID
     */
    async saveItemWithImages(
        userId: string,
        mainImageUrl: string,
        additionalImageUrls: string[],
        formState: ItemFormState,
        tags: string[] = []
    ): Promise<string> {
        // 1. itemsテーブルに保存
        const { data: insertedItem, error: dbError } = await supabase
            .from("items")
            .insert({
                user_id: userId,
                image_url: mainImageUrl,
                title: formState.title,
                description: formState.description,
                price: formState.price,
                status: formState.status,
                category: DEFAULTS.category,
                tags: tags,
            })
            .select("id")
            .single();

        if (dbError || !insertedItem) {
            throw new Error(`Database save failed: ${dbError?.message}`);
        }

        const itemId = insertedItem.id;

        // 2. item_imagesテーブルに全画像を保存
        const allImageUrls = [mainImageUrl, ...additionalImageUrls];
        const imageRecords = allImageUrls.map((url, index) => ({
            item_id: itemId,
            image_url: url,
            sort_order: index,
            is_main: index === 0,
        }));

        const { error: imagesError } = await supabase
            .from("item_images")
            .insert(imageRecords);

        if (imagesError) {
            console.error("Failed to save item images:", imagesError);
            // メイン画像はitemsテーブルに保存済みなので、ここでは警告のみ
        }

        return itemId;
    },

    /**
     * 複数画像をアップロード
     *
     * @param blobs - アップロードするファイル配列
     * @param userId - ユーザーID
     * @returns アップロード後のURL配列
     */
    async uploadMultipleImages(blobs: Blob[], userId: string): Promise<string[]> {
        const urls: string[] = [];

        for (let i = 0; i < blobs.length; i++) {
            const blob = blobs[i];
            const fileName = `${userId}/${Date.now()}-${i}.png`;

            const { error: uploadError } = await supabase.storage
                .from("item-images")
                .upload(fileName, blob, { contentType: "image/png" });

            if (uploadError) {
                console.error(`Image ${i + 1} upload failed:`, uploadError);
                continue;
            }

            const { data: { publicUrl } } = supabase.storage
                .from("item-images")
                .getPublicUrl(fileName);

            urls.push(publicUrl);
        }

        return urls;
    },

    /**
     * 処理中アイテムを作成（リアルタイム生成フロー用）
     *
     * 最初にpending状態で空のアイテムを作成し、
     * 生成が進むにつれてフィールドを更新していく
     *
     * @param userId - ユーザーID
     * @param status - 商品の状態
     * @param initialImageUrl - 初期画像URL（オプション、先行アップロード時に使用）
     * @returns 作成したアイテムのID
     */
    async createPendingItem(userId: string, status: string, initialImageUrl?: string): Promise<string> {
        const { data, error } = await supabase
            .from("items")
            .insert({
                user_id: userId,
                image_url: initialImageUrl || "", // 初期画像URLがあれば使用
                title: "",
                description: "",
                price: 0,
                status: status,
                processing_status: "pending",
            })
            .select("id")
            .single();

        if (error || !data) {
            throw new Error(`Failed to create pending item: ${error?.message}`);
        }

        return data.id;
    },

    /**
     * アイテムのフィールドを更新
     *
     * @param itemId - 更新対象のアイテムID
     * @param updates - 更新するフィールド
     */
    async updateItem(
        itemId: string,
        updates: {
            title?: string;
            description?: string;
            price?: number;
            image_url?: string;
            processing_status?: "pending" | "processing_text" | "processing_images" | "completed" | "failed";
            tags?: string[];
        }
    ): Promise<void> {
        const { error } = await supabase
            .from("items")
            .update(updates)
            .eq("id", itemId);

        if (error) {
            throw new Error(`Failed to update item: ${error.message}`);
        }
    },

    /**
     * アイテムを取得
     *
     * @param itemId - 取得対象のアイテムID
     * @returns アイテムデータ
     */
    async getItem(itemId: string) {
        const { data, error } = await supabase
            .from("items")
            .select("*")
            .eq("id", itemId)
            .single();

        if (error) {
            throw new Error(`Failed to get item: ${error.message}`);
        }

        return data;
    },

    /**
     * アイテムの画像を保存
     *
     * @param itemId - アイテムID
     * @param imageUrls - 画像URL配列
     */
    async saveItemImages(itemId: string, imageUrls: string[]): Promise<void> {
        const imageRecords = imageUrls.map((url, index) => ({
            item_id: itemId,
            image_url: url,
            sort_order: index,
            is_main: index === 0,
        }));

        const { error } = await supabase
            .from("item_images")
            .insert(imageRecords);

        if (error) {
            console.error("Failed to save item images:", error);
        }
    },

    /**
     * item_imagesテーブルの特定画像を更新
     *
     * @param itemId - アイテムID
     * @param sortOrder - 更新対象の画像のsort_order
     * @param newImageUrl - 新しい画像URL
     */
    async updateItemImage(itemId: string, sortOrder: number, newImageUrl: string): Promise<void> {
        const { error } = await supabase
            .from("item_images")
            .update({ image_url: newImageUrl })
            .eq("item_id", itemId)
            .eq("sort_order", sortOrder);

        if (error) {
            console.error("Failed to update item image:", error);
        }
    }
};
