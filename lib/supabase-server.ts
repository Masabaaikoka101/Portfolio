/**
 * Supabase サーバークライアント
 *
 * このファイルの役割:
 * - Server Components で使用する Supabase クライアント
 * - cookies を使用したセッション管理
 *
 * Why サーバー用のクライアントを分離するのか:
 * - Server Components は `cookies()` でセッションを取得
 * - クライアント用は `useEffect` でセッションを取得
 * - 同じクライアントを共有すると認証状態が混乱する
 *
 * Note:
 * - この実装は Supabase の SSR パッケージなしでの簡易版
 * - 本格的な SSR には @supabase/ssr の利用を推奨
 *
 * Learning:
 * - Supabase SSR: https://supabase.com/docs/guides/auth/server-side
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Server Components 用 Supabase クライアント
 *
 * Note:
 * - この簡易版は認証状態を保持しない（各リクエストで新規作成）
 * - RLS ポリシーは anon key でアクセス可能なデータのみ取得
 * - 認証が必要な操作はクライアント側で行う
 */
export function createServerClient() {
    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
        },
    });
}
