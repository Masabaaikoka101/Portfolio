/**
 * サイトヘッダーコンポーネント
 *
 * このコンポーネントの役割:
 * - アプリケーション共通のヘッダーUI
 * - ロゴ、ナビゲーション、認証状態表示
 * - 使い方モーダルの表示
 * - 新規作成時のファイル選択
 *
 * Why コンポーネントとして分離するのか:
 * - 全ページで共通使用するため
 * - 認証状態に応じたUIの切り替えを一元管理
 * - レイアウトファイル(layout.tsx)から呼び出される
 *
 * UI/UXの設計方針:
 * - ログインページ: ロゴのみ表示（フォームに集中させる）
 * - ログイン済み: 使い方 → 新規作成（青） → ユーザーアバター
 * - 新規作成ボタンをクリック → ファイル選択ダイアログ → ホームページへ
 *
 * Learning:
 * - Supabase Auth: https://supabase.com/docs/guides/auth
 * - usePathname: https://nextjs.org/docs/app/api-reference/functions/use-pathname
 */

"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { HelpCircle, LogOut, Plus, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useNavigationGuard } from "@/contexts/navigation-guard-context";

/**
 * サイトヘッダーコンポーネント
 */
export function SiteHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const { confirmNavigation } = useNavigationGuard();

    const [isHelpOpen, setIsHelpOpen] = useState(false);

    /** 認証済みユーザー */
    const [user, setUser] = useState<SupabaseUser | null>(null);

    /**
     * ログインページかどうか
     * ログインページではナビゲーションを非表示にする
     */
    const isLoginPage = pathname === "/login";

    /**
     * 認証状態の初期化と監視
     */
    useEffect(() => {
        // 現在のセッションを取得
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        // 認証状態の変更を監視
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        // クリーンアップ
        return () => subscription.unsubscribe();
    }, []);

    /**
     * ログアウト処理
     */
    const handleLogout = async () => {
        // ナビゲーションガードの確認
        if (!confirmNavigation()) return;

        const { error } = await supabase.auth.signOut();
        if (error) {
            toast.error("ログアウトに失敗しました");
        } else {
            toast.success("ログアウトしました");
            window.location.href = "/login";
        }
    };

    /**
     * ユーザーのイニシャルを取得
     */
    const getUserInitial = () => {
        if (!user?.email) return "U";
        return user.email.charAt(0).toUpperCase();
    };

    /**
     * 新規作成ボタンクリック → トップページへ遷移（リセットフラグ付き）
     */
    const handleNewClick = () => {
        // ナビゲーションガードの確認
        if (!confirmNavigation()) return;

        // トップページへ遷移し、フォームをリセットするためのクエリパラメータを付与
        router.push("/new?reset=true");
    };

    /**
     * ロゴクリックハンドラー
     */
    const handleLogoClick = (e: React.MouseEvent) => {
        // ナビゲーションガードの確認
        if (!confirmNavigation()) {
            e.preventDefault();
        }
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="container flex h-16 items-center justify-between px-4">
                {/* 左側: ロゴ + アプリ名 */}
                {user ? (
                    <Link href="/" onClick={handleLogoClick} className="flex items-center gap-1.5 group">
                        <Image
                            src="/logo.svg"
                            alt="Pigro"
                            width={40}
                            height={40}
                            className="object-contain transition-transform group-hover:scale-105"
                        />
                        <span className="text-lg font-bold text-gray-900 tracking-tight">
                            Pigro
                        </span>
                    </Link>
                ) : (
                    <div className="flex items-center gap-1.5">
                        <Image
                            src="/logo.svg"
                            alt="Pigro"
                            width={40}
                            height={40}
                            className="object-contain"
                        />
                        <span className="text-lg font-bold text-gray-900 tracking-tight">
                            Pigro
                        </span>
                    </div>
                )}

                {/* 右側: ナビゲーション */}
                <div className="flex items-center gap-2">
                    {/* 使い方モーダル - 常に表示 */}
                    <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
                        <DialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                            >
                                <HelpCircle className="h-4 w-4" />
                                <span className="hidden sm:inline ml-1.5">使い方</span>
                            </Button>
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
                            {/* バグ報告リンク */}
                            <div className="text-center pt-2 border-t">
                                <a
                                    href="https://forms.gle/gmjTgxPjNaCjmXJR7"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-gray-500 hover:text-blue-600 underline"
                                >
                                    バグ・ご意見を報告する
                                </a>
                            </div>
                            <Button
                                onClick={() => setIsHelpOpen(false)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full"
                            >
                                閉じる
                            </Button>
                        </DialogContent>
                    </Dialog>

                    {/* 右側: ナビゲーション - ログイン時のみ */}
                    {user && (
                        <div className="flex items-center gap-1.5 md:gap-3">
                            <Button
                                onClick={handleNewClick}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-sm hover:shadow active:scale-95 transition-all h-9 px-3 md:h-10 md:px-4 flex items-center justify-center gap-1.5"
                            >
                                <Plus className="h-4 w-4 md:h-5 md:w-5" />
                                <span className="text-xs md:text-sm font-bold whitespace-nowrap">新規作成</span>
                            </Button>

                            {/* ユーザーメニュー */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="flex items-center gap-1 hover:bg-gray-100 px-2"
                                    >
                                        {/* ユーザーアバター */}
                                        {user.user_metadata?.avatar_url ? (
                                            <div className="relative h-8 w-8 rounded-full overflow-hidden border border-gray-200">
                                                <Image
                                                    src={user.user_metadata.avatar_url}
                                                    alt="Avatar"
                                                    fill
                                                    sizes="32px"
                                                    className="object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-700 font-semibold text-sm">
                                                {getUserInitial()}
                                            </div>
                                        )}
                                        <ChevronDown className="h-3 w-3 text-gray-500 hidden md:block" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    {/* ユーザー情報 */}
                                    <div className="px-3 py-2 border-b">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {user.email}
                                        </p>
                                    </div>
                                    {/* ログアウト */}
                                    <DropdownMenuItem
                                        onClick={handleLogout}
                                        className="flex items-center gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer m-1"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        <span>ログアウト</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
