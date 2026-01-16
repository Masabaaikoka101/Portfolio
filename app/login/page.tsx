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
 * - Real-time Validation: 入力中にパスワード要件をチェック
 *
 * Learning:
 * - Supabase Auth: https://supabase.com/docs/guides/auth/quickstarts/nextjs
 * - Floating Label: https://css-tricks.com/float-labels-css/
 */

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Check, HelpCircle } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

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
    const [showPassword, setShowPassword] = useState(false);

    // ラベルが上に移動する条件: フォーカス中 または 値がある
    const isFloating = isFocused || value.length > 0;

    // パスワード表示切り替え用
    const isPasswordType = type === "password";
    const inputType = isPasswordType ? (showPassword ? "text" : "password") : type;

    return (
        <div className="relative">
            <input
                id={id}
                name={id}
                type={inputType}
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

            {/* パスワード表示切り替えボタン */}
            {isPasswordType && (
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none p-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                    {showPassword ? (
                        <EyeOff className="h-5 w-5" aria-hidden="true" />
                    ) : (
                        <Eye className="h-5 w-5" aria-hidden="true" />
                    )}
                    <span className="sr-only">
                        {showPassword ? "パスワードを隠す" : "パスワードを表示する"}
                    </span>
                </button>
            )}
        </div>
    );
}

/**
 * パスワード要件チェックリストアイテム
 */
function RequirementItem({ met, text }: { met: boolean; text: string }) {
    return (
        <div className={`flex items-center gap-2 text-xs transition-colors duration-200 ${met ? "text-green-600 font-medium" : "text-gray-400"}`}>
            {met ? (
                <Check className="h-4 w-4" />
            ) : (
                <div className="h-4 w-4 rounded-full border border-gray-300" />
            )}
            <span>{text}</span>
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
    /** 確認用パスワード */
    const [confirmPassword, setConfirmPassword] = useState("");

    // パスワード要件チェック
    const requirements = useMemo(() => {
        return {
            length: password.length >= 8,
            notOnlyNumbers: password.length > 0 && !/^\d+$/.test(password), // 数字のみはNG
        };
    }, [password]);

    // 登録ボタンを有効にする条件
    // 必須: 8文字以上 AND 数字以外を含む AND (確認パスワード一致 OR ログインモード)
    const isFormValid = useMemo(() => {
        if (isLogin) return email.length > 0 && password.length > 0;

        return (
            email.length > 0 &&
            requirements.length &&
            requirements.notOnlyNumbers &&
            password === confirmPassword
        );
    }, [isLogin, email, password, confirmPassword, requirements]);

    /**
     * 認証処理
     */
    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();

        // 新規登録時の追加バリデーション
        if (!isLogin) {
            if (!requirements.length) {
                toast.error("パスワードは8文字以上で入力してください");
                return;
            }
            if (!requirements.notOnlyNumbers) {
                toast.error("パスワードは英数字で入力してください");
                return;
            }
            if (password !== confirmPassword) {
                toast.error("パスワードが一致しません");
                return;
            }
        }

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
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    },
                });

                if (signUpError) throw signUpError;

                if (data.session) {
                    toast.success("ログインしました");
                    router.push("/");
                    router.refresh();
                } else {
                    toast.success("確認メールを送信しました。メールを確認してください。");
                }
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            console.warn("Authentication error:", message);
            const errorMessage = translateError(message);
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
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            console.warn("Password reset error:", message);
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
                            ? "Pigroを使って出品作業を効率化しましょう"
                            : "すべての機能を使うには登録が必要です"}
                    </p>
                </div>

                {/* Googleログインボタン */}
                <div className="mt-8 space-y-4">
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full py-6 flex items-center justify-center gap-3 text-base border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
                        onClick={async () => {
                            setLoading(true);
                            try {
                                const { error } = await supabase.auth.signInWithOAuth({
                                    provider: 'google',
                                    options: {
                                        redirectTo: `${window.location.origin}/auth/callback`,
                                    },
                                });
                                if (error) throw error;
                            } catch (error) {
                                const message = error instanceof Error ? error.message : "Google login failed";
                                console.error("Google login error:", message);
                                toast.error("ログインに失敗しました");
                                setLoading(false);
                            }
                        }}
                        disabled={loading}
                    >
                        {/* Google Logo SVG */}
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.21-1.18-2.21z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        <span className="font-medium text-gray-700">Googleでログイン</span>
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-500">またはメールアドレスで</span>
                        </div>
                    </div>
                </div>

                {/* 認証フォーム */}
                <form className="mt-4 space-y-5" onSubmit={handleAuth}>
                    <FloatingInput
                        id="email"
                        label="メールアドレス"
                        type="email"
                        value={email}
                        onChange={setEmail}
                        autoComplete="email"
                        required
                    />

                    <div className="space-y-2">
                        <FloatingInput
                            id="password"
                            label="パスワード"
                            type="password"
                            value={password}
                            onChange={setPassword}
                            autoComplete="current-password"
                            required
                        />

                        {/* パスワード要件チェックリスト（新規登録時のみ） */}
                        {!isLogin && (
                            <div className="px-1 space-y-1">
                                <RequirementItem met={requirements.length} text="8文字以上" />
                                <RequirementItem met={requirements.notOnlyNumbers} text="英数字" />
                            </div>
                        )}
                    </div>

                    {/* パスワード（確認用）（新規登録時のみ） */}
                    {!isLogin && (
                        <FloatingInput
                            id="confirm-password"
                            label="パスワード（確認用）"
                            type="password"
                            value={confirmPassword}
                            onChange={setConfirmPassword}
                            autoComplete="new-password"
                            required
                        />
                    )}

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
                        className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading || !isFormValid}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isLogin ? "ログイン" : "アカウント登録"}
                    </Button>
                </form>

                {/* モード切り替え */}
                <div className="text-center text-sm">
                    <button
                        type="button"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            // モード切り替え時にフォームをクリア
                            setPassword("");
                            setConfirmPassword("");
                        }}
                        className="font-medium text-blue-600 hover:text-blue-500 hover:underline"
                    >
                        {isLogin
                            ? "アカウントをお持ちでない方は登録へ"
                            : "すでにアカウントをお持ちの方はログインへ"}
                    </button>
                </div>

                {/* 使い方モーダル */}
                <div className="text-center">
                    <Dialog>
                        <DialogTrigger asChild>
                            <button
                                type="button"
                                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                            >
                                <HelpCircle className="h-4 w-4" />
                                <span>Pigroの使い方を見る</span>
                            </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold">
                                    Pigroの使い方
                                </DialogTitle>
                            </DialogHeader>

                            {/* YouTube動画埋め込み */}
                            {process.env.NEXT_PUBLIC_TUTORIAL_VIDEO_ID && (
                                <div className="relative w-full rounded-lg overflow-hidden bg-gray-900" style={{ paddingBottom: '56.25%' }}>
                                    <iframe
                                        className="absolute top-0 left-0 w-full h-full border-0"
                                        src={`https://www.youtube.com/embed/${process.env.NEXT_PUBLIC_TUTORIAL_VIDEO_ID}?rel=0`}
                                        title="Pigro使い方チュートリアル"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                </div>
                            )}

                            {/* ステップ説明 */}
                            <div className="space-y-4 py-4">
                                <div className="flex gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                                        1
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">ログイン・新規登録</h3>
                                        <p className="text-sm text-gray-600">
                                            まずログインして、あなた専用のデータ管理しましょう
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                                        2
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">商品画像をアップロード</h3>
                                        <p className="text-sm text-gray-600">
                                            売りたい商品の写真を選択してください
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                                        3
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">AIが自動生成</h3>
                                        <p className="text-sm text-gray-600">
                                            商品画像・商品名・説明文・価格をAIが提案します
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                                        4
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">編集して更新</h3>
                                        <p className="text-sm text-gray-600">
                                            内容を確認・編集してから更新できます
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

            </div>
        </div>
    );
}
