# コードスタイル・規約

## 言語・エンコーディング
- TypeScript (strict mode)
- UTF-8
- ESLint 9 + eslint-config-next 16.1.1

## ファイル命名規則
| カテゴリ | 命名規則 | 例 |
|---------|---------|-----|
| コンポーネント | PascalCase / kebab-case | `MercariPreview.tsx`, `site-header.tsx` |
| Hooks | kebab-case + use prefix | `use-item-form.ts` |
| Services | kebab-case + .service suffix | `ai.service.ts` |
| コンテキスト | PascalCase/kebab-case + Context | `auth-context.tsx`, `BatchJobContext.tsx` |
| UI基盤 | kebab-case | `button.tsx`, `dialog.tsx` |

## コメント・ドキュメント
- JSDoc形式のコメントを使用
- 日本語でのコメント記述
- Why/What/Howの説明を含める

## React パターン
- 関数コンポーネント + Hooks
- カスタムフックでロジック分離
- Composite Hook Pattern (統合フック)
- Context APIで状態管理

## Gitワークフロー
- Conventional Commits (`feat:`, `fix:`, `refactor:`)
- `develop`ブランチベース開発
- Pull Request必須
- mainブランチへの直接コミット禁止

## UIスタイリング
- モバイルファースト
- Tailwind CSS 4でスタイリング
- Radix UI + shadcn/uiコンポーネント
- Framer Motionでアニメーション

## ディレクトリ配置
| ファイル種類 | 配置場所 |
|------------|---------|
| ページ | `app/` |
| APIルート | `app/api/` |
| 機能コンポーネント | `components/features/` |
| UI基盤 | `components/ui/` |
| カスタムHooks | `hooks/` |
| ビジネスロジック | `services/` |
| ユーティリティ | `lib/` |
| 型定義 | `types/` |
| コンテキスト | `contexts/` |
