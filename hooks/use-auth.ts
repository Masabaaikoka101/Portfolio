"use client";

import { useEffect, useRef } from "react";
import { useAuthContext } from "@/contexts/auth-context";
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
 */
export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
    const { required = true, redirectTo = "/login" } = options;
    const { user, isLoading, isAuthenticated } = useAuthContext();

    // リダイレクト済みフラグ（二重リダイレクト防止）
    const hasRedirectedRef = useRef(false);

    useEffect(() => {
        if (isLoading) return;

        // ログイン必須で未ログインの場合、リダイレクト
        if (required && !isAuthenticated && !hasRedirectedRef.current) {
            hasRedirectedRef.current = true;
            window.location.href = redirectTo;
        }
    }, [isLoading, isAuthenticated, required, redirectTo]);

    return {
        user,
        isLoading,
        isAuthenticated,
    };
}
