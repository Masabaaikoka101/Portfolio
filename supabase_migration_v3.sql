-- ============================================================================
-- リアルタイム生成フロー対応マイグレーション
-- ============================================================================
-- 
-- このマイグレーションの目的:
-- - 商品の処理ステータスを追跡できるようにする
-- - リアルタイム生成フローでの段階的な更新を可能にする
-- 
-- 実行方法:
-- 1. Supabaseダッシュボードにログイン
-- 2. SQL Editor で以下のSQLを実行
-- ============================================================================

-- processing_statusカラムを追加
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'completed';

-- コメント追加
COMMENT ON COLUMN public.items.processing_status IS '処理ステータス: pending, processing_text, processing_images, completed, failed';

-- 既存データを全てcompletedに設定（既に生成完了済みのため）
UPDATE public.items SET processing_status = 'completed' WHERE processing_status IS NULL;
