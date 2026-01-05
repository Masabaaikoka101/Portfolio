/**
 * サイトヘッダーコンポーネント
 *
 * このコンポーネントの役割:
 * - アプリケーション共通のヘッダーUI
 * - ロゴ、ナビゲーション、認証状態表示
 * - 使い方モーダルの表示
 *
 * Why コンポーネントとして分離するのか:
 * - 全ページで共通使用するため
 * - 認証状態に応じたUIの切り替えを一元管理
 * - レイアウトファイル(layout.tsx)から呼び出される
 *
 * 認証状態の管理:
 * - useEffectで初期セッション取得
 * - onAuthStateChangeでリアルタイム監視
 * - ログイン/ログアウトに応じてUIを動的更新
 *
 * Learning:
 * - Supabase Auth: https://supabase.com/docs/guides/auth
 * - onAuthStateChange: https://supabase.com/docs/reference/javascript/auth-onauthstatechange
 * - Radix Dialog: https://www.radix-ui.com/primitives/docs/components/dialog
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HelpCircle, Plus, LogIn, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

/**
 * サイトヘッダーコンポーネント
 *
 * Why クライアントコンポーネントなのか:
 * - 認証状態の監視にuseEffectが必要
 * - モーダルの開閉にuseStateが必要
 * - ログアウト等のインタラクションが必要
 */
export function SiteHeader() {
    const router = useRouter();

    /** 使い方モーダルの開閉状態 */
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    /**
     * 認証済みユーザー
     *
     * Why anyではなくUser型を使うべきか:
     * - 型安全性の向上
     * - IDEの補完機能が効く
     * - Note: 既存コードとの互換性のためUser | nullを使用
     */
    const [user, setUser] = useState<User | null>(null);

    /**
     * 認証状態の初期化と監視
     *
     * Why useEffectで行うのか:
     * - コンポーネントマウント時に一度だけ実行
     * - クリーンアップでsubscriptionを解除
     *
     * Why getSessionとonAuthStateChangeの両方を使うのか:
     * - getSession: 初期ロード時の状態取得
     * - onAuthStateChange: ログイン/ログアウト時のリアルタイム更新
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

        // クリーンアップ: メモリリーク防止
        return () => subscription.unsubscribe();
    }, []);

    /**
     * ログアウト処理
     *
     * What this does:
     * 1. Supabaseからサインアウト
     * 2. 成功/失敗をトースト通知
     * 3. ホームページにリダイレクト
     */
    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            toast.error("ログアウトに失敗しました");
        } else {
            toast.success("ログアウトしました");
            router.push("/");
            router.refresh();
        }
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-white">
            <div className="container flex h-16 items-center justify-between px-4">
                {/* 左側: ロゴ + アプリ名 */}
                <Link href="/" className="flex items-center gap-1">
                    <Image
                        src="/logo.svg"
                        alt="AXEL"
                        width={48}
                        height={48}
                        className="object-contain"
                    />
                    <span className="text-lg font-bold text-gray-900 tracking-tight">
                        AXEL
                    </span>
                </Link>

                {/* 右側: ナビゲーション */}
                <div className="flex items-center gap-3">
                    {/* 使い方モーダル */}
                    <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
                        <DialogTrigger asChild>
                            <button
                                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                <HelpCircle className="h-4 w-4" />
                                <span className="hidden sm:inline">使い方</span>
                            </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold">
                                    AXELの使い方
                                </DialogTitle>
                            </DialogHeader>
                            {/* ステップ説明 */}
                            <div className="space-y-4 py-4">
                                <div className="flex gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                                        1
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">ログイン・新規登録</h3>
                                        <p className="text-sm text-gray-600">
                                            まずログインして、あなた専用のデータを管理しましょう
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
                                            商品名・説明文・価格をAIが提案します
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                                        4
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">編集して保存</h3>
                                        <p className="text-sm text-gray-600">
                                            内容を確認・編集してから保存できます
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <Button
                                onClick={() => setIsHelpOpen(false)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full"
                            >
                                閉じる
                            </Button>
                        </DialogContent>
                    </Dialog>

                    {/* 認証状態に応じたボタン */}
                    {user ? (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleLogout}
                                className="text-gray-600 hover:text-red-600"
                            >
                                <LogOut className="h-4 w-4 sm:mr-1" />
                                <span className="hidden sm:inline">ログアウト</span>
                            </Button>
                            <Link href="/">
                                <Button className="bg-gray-900 text-white hover:bg-gray-800 rounded-full px-4 flex items-center gap-1.5 ml-2">
                                    <Plus className="h-4 w-4" />
                                    <span>新規作成</span>
                                </Button>
                            </Link>
                        </>
                    ) : (
                        <Link href="/login">
                            <Button className="bg-blue-600 text-white hover:bg-blue-700 rounded-full px-4 flex items-center gap-1.5">
                                <LogIn className="h-4 w-4" />
                                <span>ログイン</span>
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
