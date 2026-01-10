-- ============================================================================
-- 複数画像対応マイグレーション
-- ============================================================================
-- 
-- このマイグレーションの目的:
-- - 1商品に対して複数の画像を紐付け可能にする
-- - 画像の並び順とメイン画像の指定を管理する
-- 
-- 実行方法:
-- 1. Supabaseダッシュボードにログイン
-- 2. SQL Editor で以下のSQLを実行
-- ============================================================================

-- 商品画像テーブル（1商品 : N画像）
create table public.item_images (
  id uuid default gen_random_uuid() primary key,
  item_id uuid references public.items(id) on delete cascade not null,
  image_url text not null,
  sort_order integer not null default 0,
  is_main boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- インデックス（item_idでの検索を高速化）
create index idx_item_images_item_id on public.item_images(item_id);

-- RLS（Row Level Security）を有効化
alter table public.item_images enable row level security;

-- ポリシー: ユーザーは自分の商品の画像のみ操作可能
create policy "Users can manage their item images"
  on public.item_images for all
  using (
    item_id in (select id from public.items where user_id = auth.uid())
  );
