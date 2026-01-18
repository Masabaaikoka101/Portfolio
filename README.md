<div align="center">

# Pigro - AI出品アシスタント

**写真を撮るだけ。あとはAIにおまかせ。**

出品の面倒くささを解消しつつ、**「売れる」**ことに特化したAI出品サポートアプリ

<br>

<!-- メインビジュアル：スクリーンショットを追加する場合はここに配置 -->
<!-- ![アプリのスクリーンショット](./docs/images/screenshot.png) -->

<br>

**サービスURL** : [https://portfolio-black-kappa-28.vercel.app](https://portfolio-black-kappa-28.vercel.app)

</div>

<br>

---

<br>

## 目次

1. [Pigroとは](#pigroとは)
2. [既存アプリとの違い](#既存アプリとの違い)
3. [開発の背景と想い](#開発の背景と想い)
4. [使い方](#使い方)
5. [主な機能](#主な機能)
6. [技術スタック](#技術スタック)
7. [技術的なこだわり](#技術的なこだわり)
8. [インフラ構成](#インフラ構成)
9. [ローカル開発](#ローカル開発)
10. [今後の展望](#今後の展望)

<br>

---

<br>

## Pigroとは

> **「売りたいけど、撮影や説明文を考えるのが面倒…」**
> **「出品したけど、写真が暗くて売れない…」**
> **「部屋が散らかっていて、綺麗な商品写真が撮れない…」**

Pigroは、これらの悩みをAI技術で解決する出品サポートアプリです。

<br>

### 3つの強み

| 強み | 詳細 |
|------|------|
| **「売れる」画像生成** | 生活感のある写真を、AIが自動で背景合成・補正。「白スタジオ」を選ぶだけで、プロがスタジオ撮影したような清潔感のある商品画像に |
| **「売れる」説明文の自動作成** | 単なるスペック列挙ではなく、購入意欲をそそる魅力的な文章をAIが自動生成 |
| **適切な価格・情報の提案** | 商品の状態を選択するだけで、適切な商品説明や価格設定を提案 |

<br>

---

<br>

## 既存アプリとの違い

**既存のAI出品アプリが「出品の速さ（手軽さ）」を重視するのに対し、Pigroは「売れること（販売力・画像の質）」を最優先にしています。**

| 比較項目 | 一般的な出品アプリ | Pigro |
|----------|-------------------|-------|
| **目的** | 早く出す | 売る |
| **説明文** | 簡易的になりがち | 購買意欲を高める文章 |
| **写真** | 撮ったままの状態 | スタジオ品質に加工 |
| **価値** | 出品作業の省力化 | 商品価値の最大化 |

<br>

---

<br>

## 開発の背景と想い

### なぜPigroを作ったのか

メルカリで不用品を売ろうとしたとき、「写真がイマイチ」「説明文を書くのが面倒」という壁にぶつかりました。公式の自動生成機能も試しましたが、**「売れなさそう」**な文章しか生成されず…。

**「もっと簡単に、もっと売れる出品ができないか？」**

この課題を解決するため、AI技術を活用した出品アシスタントを開発しました。

<br>

### こだわったポイント

| こだわり | 詳細 |
|----------|------|
| **モバイルファースト** | スマホでの片手操作を最優先に設計。縦長UI、タップ数の最小化 |
| **品質と速度の両立** | 5並列のAI処理で高速化しつつ、プロ級の成果物を実現 |
| **加工の倫理** | 「見せ方を変えるが、事実は変えない」を鉄則に。商品の傷を消すなどの変造は禁止 |
| **触って気持ちいいUI** | ドラッグ&ドロップ、Before/After比較、スケルトンローディングなど細部まで配慮 |

<br>

---

<br>

## 使い方

<table>
  <tr>
    <td align="center" width="33%">
      <strong>Step 1</strong><br>
      <strong>ログイン</strong><br><br>
      Googleアカウント連携で<br>ワンタップログイン
    </td>
    <td align="center" width="33%">
      <strong>Step 2</strong><br>
      <strong>モード選択</strong><br><br>
      「単品生成」or<br>「まとめて生成」
    </td>
    <td align="center" width="33%">
      <strong>Step 3</strong><br>
      <strong>写真アップロード</strong><br><br>
      カメラ撮影 or アルバムから<br>最大5枚まで選択
    </td>
  </tr>
  <tr>
    <td align="center">
      <strong>Step 4</strong><br>
      <strong>商品の状態を選択</strong><br><br>
      「新品」「目立った傷なし」<br>などをタップ
    </td>
    <td align="center">
      <strong>Step 5</strong><br>
      <strong>背景スタイルを選択</strong><br><br>
      白スタジオ推奨！<br>AIが綺麗な背景に合成
    </td>
    <td align="center">
      <strong>Step 6</strong><br>
      <strong>生成 → 出品</strong><br><br>
      数秒で完成！<br>コピペでフリマアプリへ
    </td>
  </tr>
</table>

<br>

---

<br>

## 主な機能

<table>
  <tr>
    <td width="50%" align="center">
      <strong>画像アップロード</strong><br><br>
      スマホカメラから直接撮影、<br>またはライブラリから複数選択<br>
      ドラッグ操作で順番入れ替えも可能
    </td>
    <td width="50%" align="center">
      <strong>AI背景加工</strong><br><br>
      White Studio（白背景＋自然な影）<br>カスタム背景（ウッド、大理石など）<br>
      生活感を消してプロ品質に
    </td>
  </tr>
  <tr>
    <td align="center">
      <strong>商品情報の自動生成</strong><br><br>
      タイトル・説明文・適正価格を<br>AIが一括生成<br>
      購買意欲を高める文章で差別化
    </td>
    <td align="center">
      <strong>Before/After比較</strong><br><br>
      長押しで加工前の画像を確認<br>直感的なインタラクション
    </td>
  </tr>
  <tr>
    <td align="center">
      <strong>メルカリプレビュー</strong><br><br>
      出品時の見た目を<br>リアルタイムで確認
    </td>
    <td align="center">
      <strong>まとめて生成モード</strong><br><br>
      複数商品を一括処理<br>大量出品もスピーディに
    </td>
  </tr>
</table>

<br>

---

<br>

## 技術スタック

### フロントエンド / BFF

| カテゴリ | 技術 | 選定理由 |
|----------|------|----------|
| フレームワーク | **Next.js 16** (App Router) | サーバーコンポーネント、API Routes、SEO対応 |
| 言語 | **TypeScript** | 型安全性による開発効率とバグ削減 |
| UIライブラリ | **Shadcn/ui** | アクセシビリティとカスタマイズ性の両立 |
| スタイリング | **Tailwind CSS v4** | CSSファースト設計、高速な開発 |
| アニメーション | **Framer Motion** | 直感的なマイクロインタラクション |
| ドラッグ&ドロップ | **dnd-kit** | 高いアクセシビリティと柔軟性 |
| バリデーション | **Zod** | スキーマ定義とランタイム検証の一元化 |

### バックエンド

| カテゴリ | 技術 | 選定理由 |
|----------|------|----------|
| 認証・DB | **Supabase** | 無料枠で認証・DBを統合。開発速度重視 |
| AI API | **Google Gemini API** | テキスト生成・画像編集を統一APIで実現 |
| ホスティング | **Vercel** | Next.jsとの親和性、Serverless Functions |

<br>

---

<br>

## 技術的なこだわり

### 1. 並列AI処理（Worker Pattern）

```
複数画像を5並列で処理 → 処理時間を大幅短縮
```

- **課題**: 5枚の画像を直列処理すると待ち時間が長すぎる
- **解決**: `Promise.all` + キュー制御で並列実行。APIレート制限も考慮
- **効果**: 5倍速の処理完了、ユーザー体験向上

### 2. 堅牢なエラーハンドリング

```typescript
// 一部の画像処理が失敗しても、他の処理は継続
const results = await Promise.allSettled(imagePromises);
```

- 部分失敗時も全体が止まらない設計
- 失敗した画像はオリジナルにフォールバック
- エラーメッセージで失敗箇所を明示

### 3. クライアント側画像圧縮

```
Vercel Serverless制限(4.5MB) → クライアント側でリサイズ・圧縮
```

- **課題**: 高解像度カメラの画像がサーバー制限を超える
- **解決**: Canvas APIで最大1536px + JPEG 85%圧縮
- **効果**: 大きな画像も安定して処理可能

### 4. Composite Hook Pattern

```typescript
// 複数フックを組み合わせた統合フック（725行）
export function useItemForm() {
  const { ...imageHook } = useImageUpload();
  const { ...analysisHook } = useAiAnalysis();
  const { ...storageHook } = useItemStorage();
  // 統合されたインターフェースを提供
}
```

- 関心の分離を維持しつつ、UIへはシンプルなAPIを提供
- テスト・再利用・保守が容易

<br>

---

<br>

## インフラ構成

```
┌─────────────────────────────────────────────────────────────┐
│                        Vercel                                │
│  ┌─────────────────────┐  ┌─────────────────────────────┐   │
│  │   Next.js Frontend  │  │  API Routes (Serverless)    │   │
│  │   (React/TypeScript)│  │  - /api/analyze             │   │
│  │                     │  │  - /api/edit-image          │   │
│  └─────────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────┐    ┌─────────────────────────┐
│       Supabase          │    │    Google Gemini API    │
│  - Authentication       │    │  - テキスト: gemini-2.5-flash │
│  - PostgreSQL DB        │    │  - 画像: gemini-2.5-flash-image │
│  - Storage              │    │                         │
└─────────────────────────┘    └─────────────────────────┘
```

<br>

---

<br>

## ローカル開発

### 前提条件

- Node.js 18+
- npm または yarn

### セットアップ

```bash
# 1. リポジトリをクローン
git clone https://github.com/your-username/mercari-ai-assistant-next.git
cd mercari-ai-assistant-next

# 2. 依存関係をインストール
npm install

# 3. 環境変数を設定
cp .env.example .env.local
# .env.local を編集し、以下を設定:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - GEMINI_API_KEY

# 4. 開発サーバーを起動
npm run dev
```

http://localhost:3000 でアプリが起動します。

<br>

---

<br>

## 今後の展望

| 優先度 | 機能 | 説明 |
|--------|------|------|
| 高 | **Web Grounding** | Google検索を活用した最新市場価格の反映 |
| 高 | **PWA対応** | オフライン対応、ホーム画面へのインストール |
| 中 | **多言語対応** | 海外フリマアプリ（eBay等）への展開 |
| 中 | **Chrome拡張** | メルカリWeb版への直接入力機能 |

<br>

---

<br>

<div align="center">

## お問い合わせ

ご質問・フィードバックがございましたら、お気軽にどうぞ。

<!-- GitHubのIssueやSNSリンクを追加 -->

</div>
