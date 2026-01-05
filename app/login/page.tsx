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

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

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
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    },
                });
                // セッションが存在するかチェック（メール確認OFFの場合は即座にセッションが返る）
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

    // 一般的なエラーメッセージを日本語に変換
    const translateError = (message: string) => {
        if (message.includes("Invalid login credentials")) return "メールアドレスまたはパスワードが間違っています";
        if (message.includes("Email not confirmed")) return "メールアドレスの確認が完了していません";
        if (message.includes("User already registered")) return "このメールアドレスは既に登録されています";
        if (message.includes("Password should be at least")) return "パスワードは6文字以上で入力してください";
        if (message.includes("rate limit")) return "試行回数が多すぎます。しばらく時間をおいてください";
        return "認証エラーが発生しました";
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-sm space-y-8 bg-white p-8 shadow-lg rounded-xl">
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

                <div className="mt-4 text-center">
                    <Link href="/" className="text-xs text-gray-500 hover:underline">
                        トップページに戻る
                    </Link>
                </div>
            </div>
        </div>
    );
}
