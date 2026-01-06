/**
 * 認証状態管理フック
 *
 * このフックの役割:
 * - ユーザーの認証状態を監視
 * - 未ログイン時のリダイレクト処理
 * - ローディング状態の管理
 *
 * Why カスタムフックとして分離するのか:
 * - 認証ロジックの再利用性向上
 * - 各ページで同じロジックを書かなくて済む
 * - 認証状態の一元管理
 *
 * Learning:
 * - Supabase Auth: https://supabase.com/docs/guides/auth
 * - onAuthStateChange: https://supabase.com/docs/reference/javascript/auth-onauthstatechange
 */

"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface UseAuthOptions {
    /** ログイン必須かどうか（デフォルト: true） */
    required?: boolean;
    /** 未ログイン時のリダイレクト先 */
    redirectTo?: string;
}

interface UseAuthReturn {
    /** 認証済みユーザー */
    user: User | null;
    /** 認証状態の読み込み中 */
    isLoading: boolean;
    /** ログイン済みかどうか */
    isAuthenticated: boolean;
}

/**
 * 認証状態管理フック
 *
 * @param options - オプション設定
 * @returns 認証状態
 *
 * @example
 * ```tsx
 * function ProtectedPage() {
 *   const { user, isLoading, isAuthenticated } = useAuth({ required: true });
 *
 *   if (isLoading) return <Loading />;
 *   if (!isAuthenticated) return null; // リダイレクト中
 *
 *   return <div>ようこそ、{user?.email}さん</div>;
 * }
 * ```
 */
export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
    const { required = true, redirectTo = "/login" } = options;

    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // リダイレクト済みフラグ（二重リダイレクト防止）
    const hasRedirectedRef = useRef(false);

    useEffect(() => {
        // 現在のセッションを取得
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setUser(session?.user ?? null);

                // ログイン必須で未ログインの場合、リダイレクト
                if (required && !session?.user && !hasRedirectedRef.current) {
                    hasRedirectedRef.current = true;
                    // window.location.hrefで確実にリダイレクト
                    window.location.href = redirectTo;
                    return;
                }

                setIsLoading(false);
            } catch (error) {
                console.error("Session check error:", error);
                setIsLoading(false);
            }
        };

        checkSession();

        // 認証状態の変更を監視
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);

            // ログイン必須で未ログインになった場合、リダイレクト
            if (required && !session?.user && !hasRedirectedRef.current) {
                hasRedirectedRef.current = true;
                window.location.href = redirectTo;
            }
        });

        // クリーンアップ
        return () => subscription.unsubscribe();
    }, [required, redirectTo]);

    return {
        user,
        isLoading,
        isAuthenticated: !!user,
    };
}
