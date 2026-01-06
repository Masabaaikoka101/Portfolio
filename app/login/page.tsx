/**
 * ログインページ
 *
 * このページの役割:
 * - ユーザー認証（ログイン/新規登録）
 * - Supabase Authとの連携
 *
 * Why クライアントコンポーネントなのか:
 * - フォーム状態（useState）を管理
 * - ユーザー入力に応じた動的なUI更新
 * - 認証APIの呼び出しとリダイレクト
 *
 * 設計パターン:
 * - Controlled Form: useState + onChange で入力値を管理
 * - Toggle Pattern: isLoginフラグでログイン/登録を切り替え
 *
 * UXの工夫:
 * - ログインと登録を1つのフォームで切り替え（ページ遷移不要）
 * - エラーメッセージの日本語化
 * - ローディング中のボタン無効化
 *
 * Learning:
 * - Supabase Auth: https://supabase.com/docs/guides/auth/quickstarts/nextjs
 * - signInWithPassword: https://supabase.com/docs/reference/javascript/auth-signinwithpassword
 * - signUp: https://supabase.com/docs/reference/javascript/auth-signup
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2 } from "lucide-react";

/**
 * ログインページコンポーネント
 *
 * 状態管理:
 * - loading: 認証処理中フラグ
 * - isLogin: ログイン/登録モードの切り替え
 * - email, password: フォーム入力値
 */
export default function LoginPage() {
    const router = useRouter();

    /** ローディング状態 */
    const [loading, setLoading] = useState(false);
    /** ログインモード（false = 新規登録モード） */
    const [isLogin, setIsLogin] = useState(true);
    /** メールアドレス */
    const [email, setEmail] = useState("");
    /** パスワード */
    const [password, setPassword] = useState("");

    /**
     * 認証処理
     *
     * What this does:
     * 1. デフォルトのフォーム送信を防止
     * 2. ローディング状態をON
     * 3. ログインまたは新規登録を実行
     * 4. 成功時: トースト通知 → ホームへリダイレクト
     * 5. 失敗時: エラーメッセージを日本語で表示
     */
    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                // ログイン
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                toast.success("ログインしました");
                router.push("/");
                router.refresh();
            } else {
                // 新規登録
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        /**
                         * メール確認後のリダイレクト先
                         *
                         * Why window.location.originを使うのか:
                         * - 開発環境とプロダクション環境でURLが異なる
                         * - 動的に現在のオリジンを取得
                         */
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    },
                });

                /**
                 * セッション確認
                 *
                 * Why data.sessionをチェックするのか:
                 * - Supabaseの設定で「メール確認なし」の場合、即座にセッションが返る
                 * - メール確認ありの場合、sessionはnull
                 */
                if (data.session) {
                    toast.success("ログインしました");
                    router.push("/");
                    router.refresh();
                } else {
                    toast.success("確認メールを送信しました。メールを確認してください。");
                }
            }
        } catch (error: any) {
            // 認証エラーは想定内なのでwarnレベルでログ出力
            console.warn("Authentication error:", error.message);
            const errorMessage = translateError(error.message);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    /**
     * エラーメッセージ翻訳
     *
     * Why 日本語化するのか:
     * - Supabaseのエラーメッセージは英語
     * - 日本語ユーザーにとって分かりやすくする
     */
    const translateError = (message: string) => {
        if (message.includes("Invalid login credentials")) return "メールアドレスまたはパスワードが間違っています";
        if (message.includes("Email not confirmed")) return "メールアドレスの確認が完了していません";
        if (message.includes("User already registered")) return "このメールアドレスは既に登録されています";
        if (message.includes("Password should be at least")) return "パスワードは6文字以上で入力してください";
        if (message.includes("rate limit")) return "試行回数が多すぎます。しばらく時間をおいてください";
        return "認証エラーが発生しました";
    };

    // =========================================================================
    // レンダリング
    // =========================================================================
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-sm space-y-8 bg-white p-8 shadow-lg rounded-xl">
                {/* ヘッダー */}
                <div className="text-center">
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                        {isLogin ? "おかえりなさい" : "アカウントを作成"}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        {isLogin
                            ? "AXELを使って出品作業を効率化しましょう"
                            : "すべての機能を使うには登録が必要です"}
                    </p>
                </div>

                {/* 認証フォーム */}
                <form className="mt-8 space-y-6" onSubmit={handleAuth}>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="email">メールアドレス</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1"
                                placeholder="name@example.com"
                            />
                        </div>

                        <div>
                            <Label htmlFor="password">パスワード</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1"
                                placeholder="••••••••"
                                minLength={6}
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 font-bold"
                        disabled={loading}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isLogin ? "ログイン" : "アカウント登録"}
                    </Button>
                </form>

                {/* モード切り替え */}
                <div className="text-center text-sm">
                    <button
                        type="button"
                        onClick={() => setIsLogin(!isLogin)}
                        className="font-medium text-blue-600 hover:text-blue-500 hover:underline"
                    >
                        {isLogin
                            ? "アカウントをお持ちでない方は登録へ"
                            : "すでにアカウントをお持ちの方はログインへ"}
                    </button>
                </div>

                {/* トップページへ戻る */}
                <div className="mt-4 text-center">
                    <Link href="/" className="text-xs text-gray-500 hover:underline">
                        トップページに戻る
                    </Link>
                </div>
            </div>
        </div>
    );
}
