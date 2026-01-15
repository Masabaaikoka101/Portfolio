# コードスタイル・規約

## 言語・エンコーディング
- TypeScript (strict mode)
- UTF-8

## ファイル命名
- コンポーネント: PascalCase (`MercariPreview.tsx`)
- Hooks: camelCase + use prefix (`use-item-form.ts`)
- Services: camelCase + .service suffix (`ai.service.ts`)

## コメント・ドキュメント
- JSDoc形式のコメントを使用
- 日本語でのコメント記述
- Why/What/Howの説明を含める

## React
- 関数コンポーネント + Hooks
- カスタムフックでロジック分離
- Composite Hook Pattern (統合フック)

## Git
- Conventional Commits (`feat:`, `fix:`, `refactor:`)
- mainブランチへの直接コミット禁止
- Pull Request必須

## UI
- モバイルファースト
- Tailwind CSSでスタイリング
- Radix UI + shadcn/uiコンポーネント
