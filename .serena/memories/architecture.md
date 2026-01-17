# アーキテクチャ概要

## アプリケーションフロー

### 1. ユーザー認証フロー
```
ログイン画面 (/login)
    ↓
Google OAuth / メールパスワード認証
    ↓
Supabase Auth → /auth/callback (OAuth) or 直接遷移
    ↓
アイテム一覧ページ (/)
```

### 2. 単品出品フロー (New Item)
```
アイテム一覧 (/) → 「単品出品」ボタン
    ↓
ファイル選択ダイアログ (FileSelectContext)
    ↓
ウィザードステップ:
  1. BackgroundSelectionStep (背景選択)
  2. ConditionSelectionStep (商品状態選択)
  3. ImageOrderingStep (画像並び替え)
    ↓
新規アイテムページ (/new)
    ↓
AI処理: 背景削除・説明文生成 (API Routes)
    ↓
プレビュー・編集 (MercariPreview)
    ↓
保存 → Supabase DB/Storage
```

### 3. まとめて出品フロー (Batch)
```
アイテム一覧 (/) → 「まとめて出品」ボタン
    ↓
BatchSettingsStep (一括設定)
    ↓
BatchJobContext で進捗管理
    ↓
複数アイテム並列処理
    ↓
アイテム一覧に追加
```

## コンポーネント階層

### ページ構造
```
app/layout.tsx (RootLayout)
├── Providers (Next-themes, Auth, BatchJob, NavigationGuard, FileSelect)
├── SiteHeader
└── children (各ページ)
    ├── app/page.tsx (アイテム一覧・選択モード)
    ├── app/login/page.tsx (ログイン)
    ├── app/new/page.tsx (新規アイテム)
    └── app/items/[id]/page.tsx (アイテム詳細・編集)
```

### 主要コンポーネント
| コンポーネント | 責務 |
|--------------|------|
| `SiteHeader` | ナビゲーション、チュートリアル、ログアウト |
| `MercariPreview` | アイテムプレビュー・フォーム表示 |
| `ImageUploader` | 画像アップロード・削除 |
| `ComparisonSlider` | ビフォーアフター画像比較 |
| `TutorialDialog` | 使い方動画モーダル |
| `ItemCard` | アイテム一覧表示カード |

## 状態管理

### Context
| Context | 役割 |
|---------|------|
| `AuthContext` | ユーザー認証状態 |
| `BatchJobContext` | 一括処理進捗 |
| `FileSelectContext` | ファイル選択ダイアログ制御 |
| `NavigationGuardContext` | 未保存変更警告 |

### カスタムHooks
| Hook | 役割 |
|------|------|
| `useAuth` | 認証操作 |
| `useItemForm` | アイテムフォーム状態 |
| `useAiAnalysis` | AI分析実行 |
| `useBatchAnalysis` | 一括AI分析 |
| `useItemList` | アイテム一覧取得 |
| `useItemStorage` | Storage操作 |
| `useItemSelection` | アイテム選択状態 |

## API設計

### `/api/analyze`
- **POST**: 画像とプロンプトからAI分析 (Gemini)
- 入力: base64画像、商品状態、背景設定
- 出力: タイトル、説明文、カテゴリ、処理済み画像

### `/api/edit-image`
- **POST**: 画像編集 (背景削除・ホワイトスタジオ化)
- 入力: base64画像、編集タイプ
- 出力: 処理済みbase64画像

## データモデル (Supabase)

### items テーブル
| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid | 主キー |
| user_id | uuid | ユーザーID (FK: auth.users) |
| title | text | 商品タイトル |
| description | text | 商品説明 |
| category | text | カテゴリ |
| condition | text | 商品状態 |
| main_image | text | メイン画像URL |
| other_images | text[] | その他画像URL配列 |
| original_main_image | text | オリジナルメイン画像URL |
| original_other_images | text[] | オリジナルその他画像URL配列 |
| created_at | timestamptz | 作成日時 |
| updated_at | timestamptz | 更新日時 |
