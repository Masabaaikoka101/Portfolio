/**
 * 認証コールバックページ
 *
 * このページの役割:
 * - メール確認後のリダイレクト処理
 * - パスワードリセット後の処理
 *
 * Why このページが必要か:
 * - Supabaseからのリダイレクト先として機能
 * - URLパラメータからトークンを取得してセッションを確立
 *
 * リダイレクトの種類:
 * - 新規登録のメール確認
 * - パスワードリセット
 *
 * Learning:
 * - Supabase Auth Helpers: https://supabase.com/docs/guides/auth/server-side/nextjs
 */

"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

/**
 * コールバック処理コンポーネント
 *
 * Why Suspenseでラップする必要があるか:
 * - useSearchParamsはクライアントサイドでのみ利用可能
 * - Next.js App RouterではSuspenseが必須
 */
function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [isRecovery, setIsRecovery] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [updating, setUpdating] = useState(false);

    // 処理済みフラグ（二重実行防止）
    const processedRef = useRef(false);

    useEffect(() => {
        // 二重実行防止
        if (processedRef.current) return;
        processedRef.current = true;

        const handleCallback = async () => {
            try {
                // URLからハッシュパラメータを取得（Supabaseがトークンをハッシュに含める）
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const type = hashParams.get("type") || searchParams.get("type");
                const accessToken = hashParams.get("access_token");

                // パスワードリセットの場合
                if (type === "recovery" && accessToken) {
                    setIsRecovery(true);
                    setLoading(false);
                    return;
                }

                // トークンがある場合（メール確認等）
                if (accessToken) {
                    const { error } = await supabase.auth.getSession();
                    if (error) {
                        console.error("Callback error:", error);
                        toast.error("認証に失敗しました");
                    } else {
                        toast.success("認証が完了しました");
                    }
                }

                // ホームにリダイレクト（window.location使用で確実に遷移）
                window.location.href = "/";
            } catch (error) {
                console.error("Callback error:", error);
                toast.error("認証処理中にエラーが発生しました");
                window.location.href = "/login";
            }
        };

        handleCallback();
    }, [searchParams]);

    /**
     * 新しいパスワードを設定
     */
    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error("パスワードが一致しません");
            return;
        }

        if (newPassword.length < 6) {
            toast.error("パスワードは6文字以上で入力してください");
            return;
        }

        setUpdating(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) throw error;

            toast.success("パスワードを更新しました");
            window.location.href = "/";
        } catch (error: any) {
            console.error("Password update error:", error);
            toast.error("パスワードの更新に失敗しました");
        } finally {
            setUpdating(false);
        }
    };

    // ローディング中
    if (loading && !isRecovery) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">認証処理中...</p>
                </div>
            </div>
        );
    }

    // パスワードリセット画面
    if (isRecovery) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
                <div className="w-full max-w-sm space-y-8 bg-white p-8 shadow-lg rounded-xl">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                            新しいパスワードを設定
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            6文字以上の新しいパスワードを入力してください
                        </p>
                    </div>

                    <form className="mt-8 space-y-6" onSubmit={handleUpdatePassword}>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="new-password">新しいパスワード</Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="mt-1"
                                    placeholder="••••••••"
                                    minLength={6}
                                />
                            </div>
                            <div>
                                <Label htmlFor="confirm-password">パスワード（確認）</Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="mt-1"
                                    placeholder="••••••••"
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 font-bold"
                            disabled={updating}
                        >
                            {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            パスワードを更新
                        </Button>
                    </form>
                </div>
            </div>
        );
    }

    return null;
}

/**
 * ローディングフォールバック
 */
function LoadingFallback() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">読み込み中...</p>
            </div>
        </div>
    );
}

/**
 * 認証コールバックページ
 *
 * Why Suspenseが必要か:
 * - useSearchParamsを使用するコンポーネントはSuspenseでラップ必須
 * - Next.js 13+ App Routerの仕様
 */
export default function AuthCallbackPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <AuthCallbackContent />
        </Suspense>
    );
}
