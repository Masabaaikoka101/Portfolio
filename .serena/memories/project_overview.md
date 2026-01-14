# プロジェクト概要

## 名前
AIフリマ出品アシスタント (fleamarket-ai-next)

## 目的
フリマアプリ（メルカリ等）への出品作業を効率化し、「売れる」出品情報を作成するWebサービス。
- プロ級の写真加工（ホワイトスタジオ化）
- 購買意欲をそそる文章生成
- フロントエンドエンジニア就職活動用ポートフォリオ

## 技術スタック
- **フレームワーク**: Next.js 16.1.1 (App Router)
- **UI**: React 19.2.3, Tailwind CSS 4, Radix UI, shadcn/ui
- **バックエンド**: Supabase (認証・DB・Storage)
- **AI**: Google Gemini API (@google/genai)
- **アニメーション**: Framer Motion
- **その他**: Zod (バリデーション), Sonner (Toast), Lucide (アイコン)

## ターゲット
- モバイルファースト設計
- メルカリの自動生成文章に不満があるユーザー

## ディレクトリ構成
```
mercari-ai-assistant-next/
├── app/           # Next.js App Router (ページ・APIルート)
├── components/    # UIコンポーネント
├── hooks/         # カスタムReact Hooks
├── services/      # ビジネスロジック (AI, Item)
├── lib/           # ユーティリティ
├── contexts/      # React Context
└── types/         # 型定義
```
