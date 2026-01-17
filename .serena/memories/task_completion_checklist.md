# タスク完了時のチェックリスト

## 必須チェック
1. ✅ `npm run lint` でエラーがないことを確認
2. ✅ `npm run build` が成功することを確認
3. ✅ 開発サーバー (`npm run dev`) で動作確認

## Antigravity プロセス (必須)
- `task.md` でタスクを管理 (Plan Mode)
- `implementation_plan.md` で計画を立てユーザー承認を得る
- `walkthrough.md` で変更内容を記録

## コード品質
- TypeScriptエラーがないこと
- 不要なimport/変数がないこと (ESLint)
- コンポーネントの責務が明確であること

## Git ワークフロー
- Conventional Commits形式のコミットメッセージ
  - `feat:` 新機能
  - `fix:` バグ修正
  - `refactor:` リファクタリング
  - `docs:` ドキュメント
  - `style:` スタイル調整
- PRを作成してdevelopブランチへマージ
- mainは本番環境専用

## UI/UX
- モバイル表示で問題がないこと
- ローディング状態が適切に表示されること
- エラーメッセージが日本語で表示されること
