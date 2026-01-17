# プロジェクト概要

## 名前
AIフリマ出品アシスタント (fleamarket-ai-next / mercari-ai-assistant-next)

## 目的
フリマアプリ（メルカリ等）への出品作業を効率化し、「売れる」出品情報を作成するWebサービス。
- プロ級の写真加工（ホワイトスタジオ化・背景削除）
- 購買意欲をそそる文章生成（AIによる商品説明・タイトル生成）
- フロントエンドエンジニア就職活動用ポートフォリオ

## 技術スタック
- **フレームワーク**: Next.js 16.1.1 (App Router)
- **UI**: React 19.2.3, Tailwind CSS 4, Radix UI, shadcn/ui
- **バックエンド**: Supabase (認証・DB・Storage)
- **AI**: Google Gemini API (@google/genai)
- **アニメーション**: Framer Motion 12
- **ドラッグ&ドロップ**: @dnd-kit
- **その他**: Zod 4 (バリデーション), Sonner (Toast), Lucide (アイコン), JSZip (一括ダウンロード)

## ターゲット
- モバイルファースト設計
- メルカリの自動生成文章に不満があるユーザー

## ディレクトリ構成
```
mercari-ai-assistant-next/
├── app/                 # Next.js App Router (ページ・APIルート)
│   ├── api/            # APIエンドポイント
│   │   ├── analyze/    # AI商品分析API
│   │   └── edit-image/ # 画像編集API (背景削除等)
│   ├── auth/           # OAuth認証コールバック
│   ├── items/          # アイテム詳細・編集ページ
│   ├── login/          # ログインページ
│   └── new/            # 新規アイテム作成ページ
├── components/          # UIコンポーネント
│   ├── features/       # 機能別コンポーネント
│   │   ├── home/       # ホーム画面関連 (ウィザードステップ等)
│   │   └── preview/    # プレビュー関連
│   └── ui/             # 基盤UIコンポーネント (shadcn/ui)
├── hooks/               # カスタムReact Hooks
│   ├── use-ai-analysis.ts       # AI分析
│   ├── use-auth.ts              # 認証
│   ├── use-batch-analysis.ts    # 一括AI分析
│   ├── use-bulk-download.ts     # 一括ダウンロード
│   ├── use-image-upload.ts      # 画像アップロード
│   ├── use-item-form.ts         # アイテムフォーム
│   ├── use-item-list.ts         # アイテムリスト
│   ├── use-item-navigation.ts   # アイテムナビゲーション
│   ├── use-item-selection.ts    # アイテム選択
│   └── use-item-storage.ts      # アイテムStorage
├── services/            # ビジネスロジック
│   ├── ai.service.ts   # AI処理サービス
│   └── item.service.ts # アイテムCRUD操作
├── lib/                 # ユーティリティ・設定
│   ├── gemini.ts       # Gemini API設定
│   ├── supabase.ts     # Supabaseクライアント (ブラウザ)
│   ├── supabase-server.ts # Supabaseクライアント (サーバー)
│   ├── schemas/        # Zodスキーマ
│   ├── constants.ts    # 定数定義
│   └── utils.ts        # 汎用ユーティリティ
├── contexts/            # React Context
│   ├── auth-context.tsx         # 認証コンテキスト
│   ├── BatchJobContext.tsx      # バッチ処理コンテキスト
│   ├── file-select-context.tsx  # ファイル選択コンテキスト
│   └── navigation-guard-context.tsx # ナビゲーションガード
├── types/               # 型定義
│   └── index.ts        # 共通型
└── utils/               # その他ユーティリティ
    └── supabase/       # Supabase関連ユーティリティ
```

## 主要機能
1. **単品出品**: 1枚の写真から商品情報を生成
2. **まとめて出品**: 複数商品を一括でAI処理
3. **画像編集**: 背景削除・ホワイトスタジオ化
4. **商品説明生成**: AIによる魅力的な説明文自動生成
5. **チュートリアル**: YouTube動画による使い方ガイド
6. **認証**: Google OAuth / メールパスワード認証
