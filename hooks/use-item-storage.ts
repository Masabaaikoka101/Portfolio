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
import { ItemFormState } from "@/types";

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
        processedImage: string,
        formState: ItemFormState,
        onSuccess?: () => void
    ) => {
        // バリデーション
        if (!processedImage || !formState.title) {
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

            // 2. 画像をBlobに変換
            // Why fetch + blob()を使うのか:
            // - Base64 Data URLからBlobへの変換で最も簡潔な方法
            // - atob + Uint8Arrayを使う方法より可読性が高い
            let imageToUpload: Blob;
            if (processedImage.startsWith("data:") || processedImage.startsWith("blob:")) {
                const response = await fetch(processedImage);
                imageToUpload = await response.blob();
            } else {
                throw new Error("Invalid image format for upload");
            }

            // 3. Supabase Storageにアップロード
            const publicUrl = await ItemService.uploadImage(imageToUpload, user.id);

            // 4. Supabase Databaseに保存
            await ItemService.saveItem(user.id, publicUrl, formState);

            // 5. 成功処理
            toast.success("保存しました！");
            onSuccess?.();

            // 6. 履歴ページへ遷移
            // Why router.refresh()を呼ぶのか:
            // - Server Componentのデータを再フェッチ
            // - キャッシュされた履歴ページを更新
            router.push("/history");
            router.refresh();

        } catch (error) {
            console.error(error);
            toast.error("保存に失敗しました");
        } finally {
            setIsSaving(false);
        }
    }, [router]);

    return {
        /** 保存中かどうか */
        isSaving,
        /** 商品を保存する関数 */
        saveItem,
    };
}
