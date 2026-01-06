/**
 * ログインページ
 *
 * このページの役割:
 * - ユーザー認証（ログイン/新規登録）
 * - パスワードリセット機能
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
 * - Floating Label Pattern: ラベルが入力時に上に移動するアニメーション
 *
 * Learning:
 * - Supabase Auth: https://supabase.com/docs/guides/auth/quickstarts/nextjs
 * - Floating Label: https://css-tricks.com/float-labels-css/
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2 } from "lucide-react";

/**
 * フローティングラベル付き入力欄コンポーネント
 *
 * Why カスタムコンポーネントにするのか:
 * - フローティングラベルのロジックを再利用可能に
 * - スタイルの一貫性を保つ
 */
interface FloatingInputProps {
    id: string;
    label: string;
    type: string;
    value: string;
    onChange: (value: string) => void;
    autoComplete?: string;
    required?: boolean;
    minLength?: number;
}

function FloatingInput({
    id,
    label,
    type,
    value,
    onChange,
    autoComplete,
    required = false,
    minLength,
}: FloatingInputProps) {
    const [isFocused, setIsFocused] = useState(false);

    // ラベルが上に移動する条件: フォーカス中 または 値がある
    const isFloating = isFocused || value.length > 0;

    return (
        <div className="relative">
            <input
                id={id}
                name={id}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                autoComplete={autoComplete}
                required={required}
                minLength={minLength}
                className={`
                    peer w-full px-4 py-3 pt-6 pb-2
                    border-2 rounded-lg bg-gray-50
                    text-gray-900 text-base
                    outline-none transition-all duration-200
                    ${isFocused
                        ? "border-blue-500 bg-white"
                        : "border-gray-200 hover:border-gray-300"
                    }
                `}
            />
            <label
                htmlFor={id}
                className={`
                    absolute left-4 
                    transition-all duration-200 ease-out
                    pointer-events-none
                    ${isFloating
                        ? "top-2 text-xs text-blue-600 font-medium"
                        : "top-1/2 -translate-y-1/2 text-base text-gray-500"
                    }
                `}
            >
                {label}
            </label>
        </div>
    );
}

/**
 * ログインページコンポーネント
 */
export default function LoginPage() {
    const router = useRouter();

    /** ローディング状態 */
    const [loading, setLoading] = useState(false);
    /** ログインモード（false = 新規登録モード） */
    const [isLogin, setIsLogin] = useState(true);
    /** パスワードリセットモード */
    const [showResetPassword, setShowResetPassword] = useState(false);
    /** メールアドレス */
    const [email, setEmail] = useState("");
    /** パスワード */
    const [password, setPassword] = useState("");

    /**
     * 認証処理
     */
    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                toast.success("ログインしました");
                router.push("/");
                router.refresh();
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    },
                });

                if (data.session) {
                    toast.success("ログインしました");
                    router.push("/");
                    router.refresh();
                } else {
                    toast.success("確認メールを送信しました。メールを確認してください。");
                }
            }
        } catch (error: any) {
            console.warn("Authentication error:", error.message);
            const errorMessage = translateError(error.message);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    /**
     * パスワードリセット処理
     */
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            toast.error("メールアドレスを入力してください");
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
            });

            if (error) throw error;

            toast.success("パスワードリセットのメールを送信しました。メールを確認してください。");
            setShowResetPassword(false);
        } catch (error: any) {
            console.warn("Password reset error:", error.message);
            toast.error("パスワードリセットメールの送信に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    /**
     * エラーメッセージ翻訳
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
    // パスワードリセット画面
    // =========================================================================
    if (showResetPassword) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
                <div className="w-full max-w-sm space-y-8 bg-white p-8 shadow-lg rounded-xl">
                    {/* ヘッダー */}
                    <div className="text-center">
                        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                            パスワードをリセット
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            登録済みのメールアドレスを入力してください。
                            パスワードリセット用のリンクを送信します。
                        </p>
                    </div>

                    {/* リセットフォーム */}
                    <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
                        <FloatingInput
                            id="reset-email"
                            label="メールアドレス"
                            type="email"
                            value={email}
                            onChange={setEmail}
                            autoComplete="email"
                            required
                        />

                        <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-3"
                            disabled={loading}
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            リセットメールを送信
                        </Button>
                    </form>

                    {/* 戻るリンク */}
                    <div className="text-center text-sm">
                        <button
                            type="button"
                            onClick={() => setShowResetPassword(false)}
                            className="font-medium text-blue-600 hover:text-blue-500 hover:underline"
                        >
                            ログイン画面に戻る
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // =========================================================================
    // ログイン/登録画面
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
                <form className="mt-8 space-y-5" onSubmit={handleAuth}>
                    <FloatingInput
                        id="email"
                        label="メールアドレス"
                        type="email"
                        value={email}
                        onChange={setEmail}
                        autoComplete="email"
                        required
                    />

                    <FloatingInput
                        id="password"
                        label="パスワード"
                        type="password"
                        value={password}
                        onChange={setPassword}
                        autoComplete="current-password"
                        required
                        minLength={6}
                    />

                    {/* パスワードを忘れた場合（ログインモードのみ表示） */}
                    {isLogin && (
                        <div className="text-right">
                            <button
                                type="button"
                                onClick={() => setShowResetPassword(true)}
                                className="text-sm text-gray-500 hover:text-blue-600 hover:underline"
                            >
                                パスワードをお忘れですか？
                            </button>
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-3"
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
