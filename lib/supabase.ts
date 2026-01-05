/**
 * Supabase クライアント初期化
 *
 * このファイルの役割:
 * - Supabaseクライアントのシングルトンインスタンスを作成
 * - アプリケーション全体で同一インスタンスを共有
 *
 * Why Supabaseを選んだか:
 * - PostgreSQL互換で、RLS（Row Level Security）によるセキュリティ
 * - 認証、ストレージ、リアルタイム機能が統合されている
 * - 無料枠が充実（個人開発に最適）
 *
 * Alternatives:
 * - Firebase: NoSQLのため、リレーショナルなデータ設計が難しい
 * - PlanetScale: MySQL互換だが、Storageが別途必要
 * - 自前のPostgreSQL + S3: 運用コストが高い
 *
 * Learning:
 * - Supabase Docs: https://supabase.com/docs
 * - Next.js + Supabase: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
 *
 * Note:
 * - NEXT_PUBLIC_* 環境変数はクライアントサイドで公開される
 * - anon key は公開されても安全（RLSで保護）
 * - service_role key は絶対にクライアントに公開しないこと
 */

import { createClient } from "@supabase/supabase-js";

/**
 * 環境変数から取得
 *
 * Why 非nullアサーション(!)を使うのか:
 * - ビルド時に環境変数が存在しない場合はエラーになるべき
 * - 実行時に undefined でクラッシュするより、明示的に必須であることを示す
 *
 * Note:
 * - .env.local に以下を設定すること:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Supabaseクライアント（シングルトン）
 *
 * Why シングルトンパターンか:
 * - 複数インスタンスを作成すると、認証状態が共有されない
 * - コネクションプールの効率的な利用
 *
 * 使用例:
 * ```typescript
 * import { supabase } from "@/lib/supabase";
 *
 * // データ取得
 * const { data, error } = await supabase.from("items").select("*");
 *
 * // 認証
 * const { data: { user } } = await supabase.auth.getUser();
 * ```
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
