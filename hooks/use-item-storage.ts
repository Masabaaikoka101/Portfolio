/**
 * 商品保存フック
 *
 * このフックの役割:
 * - 商品データの永続化（画像アップロード + DB保存）を管理
 * - 認証チェックとリダイレクト処理
 * - 保存完了後のナビゲーション
 *
 * Why カスタムフックに分離するのか:
 * - 保存処理は複数ステップで複雑（認証→画像変換→アップロード→DB保存）
 * - ローディング状態とエラーハンドリングを一元管理
 * - UIコンポーネントをシンプルに保つ
 *
 * 処理フロー:
 * 1. バリデーション（必須項目チェック）
 * 2. 認証チェック（未ログインならリダイレクト）
 * 3. 画像をBlobに変換
 * 4. Supabase Storageにアップロード
 * 5. Supabase Databaseに保存
 * 6. 成功通知 → 履歴ページへ遷移
 *
 * Learning:
 * - useRouter (App Router): https://nextjs.org/docs/app/api-reference/functions/use-router
 * - Blob API: https://developer.mozilla.org/ja/docs/Web/API/Blob
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ItemService } from "@/services/item.service";
import { ItemFormState, BatchItem } from "@/types";

/**
 * 商品保存フック
 *
 * Why isSavingフラグが必要か:
 * - 保存中のボタン二重クリック防止
 * - ローディングUI表示
 * - UXの向上
 *
 * @returns 保存中フラグと保存関数
 */
export function useItemStorage() {
    /** 保存中フラグ */
    const [isSaving, setIsSaving] = useState(false);

    /**
     * Next.js App Routerのルーター
     *
     * Why useRouterを使うのか:
     * - プログラム的なページ遷移が可能
     * - router.refresh()でServer Componentの再フェッチが可能
     */
    const router = useRouter();

    /**
     * 商品を保存
     *
     * Why async関数をuseCallbackでラップするのか:
     * - 関数の参照を安定させる
     * - 依存配列で再生成タイミングを制御
     *
     * エラーハンドリング戦略:
     * - 早期リターン: バリデーション失敗時
     * - try-catch: 非同期処理のエラーをキャッチ
     * - ユーザーへのフィードバック: toast で通知
     *
     * @param processedImage - 保存する画像（Base64 Data URL）
     * @param formState - フォーム入力値
     * @param onSuccess - 成功時のオプショナルコールバック
     */
    const saveItem = useCallback(async (
        processedImages: (string | null)[],
        formState: ItemFormState,
        onSuccess?: () => void,
        backgroundType?: string
    ) => {
        // バリデーション：有効な画像が少なくとも1つあること
        const validImages = processedImages.filter((img): img is string => !!img);
        if (validImages.length === 0 || !formState.title) {
            toast.error("必要な情報が不足しています");
            return;
        }

        setIsSaving(true);
        try {
            // 1. 認証チェック
            const user = await ItemService.getCurrentUser();

            if (!user) {
                toast.error("ログインが必要です");
                router.push("/login");
                return;
            }

            // 2. 画像を並列アップロード
            const uploadPromises = validImages.map(async (imageStr) => {
                let imageToUpload: Blob;
                if (imageStr.startsWith("data:") || imageStr.startsWith("blob:")) {
                    const response = await fetch(imageStr);
                    imageToUpload = await response.blob();
                } else {
                    throw new Error("Invalid image format for upload");
                }
                return ItemService.uploadImage(imageToUpload, user.id);
            });

            const uploadedUrls = await Promise.all(uploadPromises);

            // 3. Supabase Databaseに保存
            // 1枚目をメイン画像、残りをother_imagesとする
            const mainImageUrl = uploadedUrls[0];
            const otherImages = uploadedUrls.slice(1);

            const finalFormState: ItemFormState = {
                ...formState,
                other_images: otherImages
            };

            await ItemService.saveItem(user.id, mainImageUrl, finalFormState, [], backgroundType);

            // 4. 成功処理
            toast.success("保存しました！");
            onSuccess?.();

            // 5. 履歴ページへ遷移
            router.push("/history");
            router.refresh();

        } catch (error) {
            console.error(error);
            toast.error("保存に失敗しました");
        } finally {
            setIsSaving(false);
        }
    }, [router]);

    /**
     * 一括出品の商品を保存
     */
    const saveBatchItems = useCallback(async (
        processedImages: (string | null)[],
        originalImages: string[],
        batchItems: BatchItem[],
        onSuccess?: () => void
    ) => {
        // バリデーション：画像と設定の数があっているか
        if (processedImages.length === 0 || batchItems.length === 0) {
            toast.error("保存する商品がありません");
            return;
        }

        setIsSaving(true);
        try {
            const user = await ItemService.getCurrentUser();
            if (!user) {
                toast.error("ログインが必要です");
                router.push("/login");
                return;
            }

            // 全アイテムを並列処理
            const savePromises = batchItems.map(async (item, index) => {
                // 画像の準備 (処理済みがあればそれ、なければオリジナル)
                const imageStr = processedImages[index] ?? originalImages[index];
                if (!imageStr) return; // 画像がない場合はスキップ

                try {
                    // 画像アップロード
                    let imageToUpload: Blob;
                    if (imageStr.startsWith("data:") || imageStr.startsWith("blob:")) {
                        const response = await fetch(imageStr);
                        imageToUpload = await response.blob();
                    } else {
                        // すでにURLの場合はアップロード不要だが、現状のフローでは全てDataURL前提
                        // URLの場合はスキップするか、再利用を検討（今回はDataURLのみ対応）
                        console.warn(`Item ${index}: Image is not a data URL, skipping upload`);
                        return;
                    }
                    const uploadedUrl = await ItemService.uploadImage(imageToUpload, user.id);

                    // DB保存
                    const formState: ItemFormState = {
                        title: item.title,
                        description: item.description,
                        price: item.price,
                        status: item.status,
                        other_images: [] // 一括出品は現状1枚のみ
                    };

                    await ItemService.saveItem(user.id, uploadedUrl, formState, [], item.backgroundType);
                } catch (e) {
                    console.error(`Failed to save item ${index}:`, e);
                    throw e; // Promise.allでキャッチさせる
                }
            });

            await Promise.all(savePromises);

            toast.success(`${batchItems.length}件の商品を保存しました！`);
            onSuccess?.();
            router.push("/history");
            router.refresh();

        } catch (error) {
            console.error("Batch save error:", error);
            toast.error("一部の商品の保存に失敗しました");
        } finally {
            setIsSaving(false);
        }
    }, [router]);

    return {
        /** 保存中かどうか */
        isSaving,
        /** 商品を保存する関数 */
        saveItem,
        /** 一括出品の商品を保存する関数 */
        saveBatchItems,
    };
}
