# AIフリマ出品アシスタント 仕様書

## 1. 概要
「AIフリマ出品アシスタント」は、フリマアプリ（メルカリ等）への出品作業を劇的に効率化し、**「売れる」**ことに特化した高品質な出品情報を作成するWebサービスです。
※本プロジェクトは、フロントエンドエンジニア就職活動用の**ポートフォリオ**として開発され、技術力（モダンなスタック、UI/UX、AI統合）の実証を目的とします。
既存のメルカリ公式機能では実現できない**プロ級の写真加工**と、**購買意欲をそそる文章生成**を、スマホ一つでスピーディに実現します。

## 2. ターゲットユーザー & 利用シーン
*   **ターゲット**:
    *   メルカリの自動生成文章に不満がある（「売れなさそう」と感じている）ユーザー。
    *   写真加工や文章作成のスキルはないが、商品を高く早く売りたい人。
*   **利用デバイス**: **モバイルファースト (スマホメイン)**
    *   スマホでの操作性を最優先に設計します（縦長UI、片手操作）。
    *   PCブラウザでも問題なく動作するレスポンシブデザインを採用し、業者などの大量処理ニーズにも応えます。

## 3. 競合優位性 (USP)
他社ツールや公式機能を凌駕する、以下の「質」と「速度」の両立を核心価値とします。

1.  **圧倒的な写真クオリティ**:
    *   AIによる「ホワイトスタジオ化」「プロ級補正」を標準搭載。素人が撮った写真を一瞬でECサイト品質に昇華させます。
2.  **「売れる」文章生成**:
    *   単なる事実の羅列ではなく、ターゲットに刺さる魅力的なコピーライティングを生成します。
    *   Google検索 (Web Grounding) を活用し、正確な市場価格とトレンドを反映させます。
3.  **実用的なスピード**:
    *   質を高めつつも、出品までのタップ数を極限まで減らし、ストレスのない操作感を実現します。

## 4. 主要機能

### 4.1 ユーザー管理 (Auth) [実装済み]
*   **会員登録・ログイン**: Googleログイン / メールアドレス認証（Supabase Auth）。
*   **データ保存**: 生成した画像やテキストの履歴をクラウド (Supabase) に保存。機種変更してもデータが引き継げます。

### 4.2 画像アップロード・AI加工
*   **アップロード**: スマホカメラからの直接アップロード、またはライブラリ選択。
*   **AI加工フロー**:
    *   **手動選択 (Manual)**: アップロード時は元画像をそのまま表示。「AI加工する」ボタンを押すことで、ユーザーの意思で加工を実行します（Before/Afterの比較がしやすいため）。
*   **AI加工モード**:
    *   **White Studio (標準)**: 背景白抜き＋自然な影生成。商品の状態は100%維持。
    *   **Custom Background**: 提供された背景テクスチャ（キャンバス、ウッド、大理石）と自然に合成。

### 4.3 高度な出品情報生成と連携（APIレス） [実装済み]
*   **Web Grounding搭載** [未実装]: 最新の市場データを検索し、適正価格と「売れる」価格を提案（今後実装予定）。
*   **メルカリプレビュー & コピー**:
    *   画面上で「メルカリに出品された時の見た目」をリアルタイムでプレビュー表示 (MercariPreviewコンポーネント)。
    *   各項目の横に「コピー」ボタンを配置し、ユーザーが任意のタイミングでクリップボードにコピー可能。
    *   **バックエンドAPI連携**: クライアントから直接外部AIを叩くのではなく、BFF (Next.js API Route) を経由してセキュアに処理を行います。

## 5. 技術スタック (BFF構成)
公開サービスとしてのセキュリティと拡張性を考慮し、以下の構成を採用します。

### フロントエンド & BFF (Backend for Frontend)
*   **Framework**: **Next.js (App Router)**
*   **Language**: TypeScript
*   **UI Library**: **Shadcn/ui** + **Tailwind CSS v4**
    *   **Tailwind v4**: 最新のCSSファーストな設定 (`@theme`, OKLCHカラー) を採用し、将来性とパフォーマンスを確保。
    *   **Shadcn/ui**: アクセシビリティとカスタマイズ性を両立した、最新の業界標準スタック。
    *   **Lucide React**: 軽量で統一感のあるモダンなアイコンライブラリ。
    *   **Sonner**: モダンで美しいトースト通知を採用し、ユーザーへのフィードバックをリッチに実装。
*   **Animation**: **Framer Motion**
    *   「触って気持ちいい」マイクロインタラクションと、シームレスな画面遷移を実現。

### バックエンド / データベース
*   **Auth & DB**: **Supabase**
    *   Free Tier (無料枠) で認証とデータベース機能を利用。
    *   ユーザー情報、出品履歴（画像URL、テキスト）を保存。

### AI エンジン
*   **API**: Google Gemini API
    *   Text: `gemini-2.5-flash`
    *   Image: `gemini-2.5-flash-image`
*   **Prompt Engineering Strategy**:
    *   **Single Source of Truth**: Zodスキーマ、JSONスキーマ、プロンプト定義を一元管理し、保守性を向上。
    *   **Chain of Thought**: 詳細な「役割定義」「厳守ルール」「出力例」を明示したプロンプトにより、高品質なアウトプットを担保。
    *   **Fallback Mechanism**: JSONパース失敗時のリトライロジックや、曖昧な部分抽出（Sub-string extraction）を実装し、安定性を確保。

## 6. データ構造

### ユーザー (`User`)
*   `id`: UUID
*   `email`: string
*   `created_at`: timestamp

### 出品履歴 (`ItemLog`)
*   `id`: UUID
*   `user_id`: User参照
*   `image_url`: string (Supabase Storage URL)
*   `processed_image_url?`: string (Optional, if processed)
*   `title`: string
*   `description`: string
*   `suggested_price`: number
*   `status`: 'draft' | 'completed'
*   `created_at`: timestamp

## 7. UI/UX コンセプト (ポートフォリオとしての見せ場)

*   **Simple Modern White (清潔感)**:
    *   白を基調とした、余白を活かしたシンプルでモダンなデザインを採用。
    *   Shadcn/ui のデフォルトテーマをベースに、アクセントカラー（青や黒）を使って「信頼感」と「清潔感」を演出します。
    *   商品写真が際立つよう、UI自体の主張は控えめにし、洗練された印象を与えます。
*   **Ethics of Editing (加工の倫理)**:
    *   **「見せ方を変えるが、事実は変えない」**を鉄の掟とします。
    *   背景の除去やライティング補正は行いますが、商品の傷を消したり、色味を現物と変えるような変造はAIに禁止させます（トラブル防止）。
*   **マイクロインタラクション**:
    *   Framer Motionを使用し、タップ時の心地よいフィードバックや、モード切替時のシームレスなアニメーションを実装。

## 8. 開発プロセス (Professional Workflow)
実務を想定した、モダンでプロフェッショナルな開発フロー採用します。
*   **Git Workflow**:
    *   Mainブランチへの直接コミットは禁止。
    *   機能ごとにFeatureブランチを作成 -> Pull Request (PR) を作成 -> (セルフ)レビュー -> マージ という一連のフローを遵守します。
*   **Commit Message**:
    *   Conventional Commits (`feat:`, `fix:`, `refactor:`) に従い、可読性の高いコミットログを維持します。

## 9. 実装環境とディレクトリ構成
本プロジェクトは、以下の構成で実装されています。

*   **Project Root**: `mercari-ai-assistant-next`
*   **Initial Setup**:
    ```bash
    npx create-next-app@latest mercari-ai-assistant-next --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
    ```
*   **Directory Structure**:
    ```text
    mercari-ai-assistant-next/
    ├── app/                # Next.js App Router
    │   ├── api/            # Backend API Routes (BFF)
    │   └── (routes)/       # Page configurations
    ├── components/         # React Components
    │   ├── ui/             # Shadcn Basic UI
    │   └── features/       # Feature-specific components (MercariPreview, etc.)
    ├── lib/                # Utilities (Supabase, Gemini wrapper)
    ├── hooks/              # Custom React Hooks
    └── types/              # Type definitions
    ```

