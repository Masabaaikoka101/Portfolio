# トラブルシューティングガイド

## よくある問題と解決策

### 1. ビルドエラー
**問題**: `npm run build` が失敗する

**解決策**:
1. まず `npm run lint` でLintエラーを確認
2. 未使用の変数・importを削除
3. TypeScriptの型エラーを修正
4. `@ts-ignore` は最終手段として使用

### 2. 画像比較スライダーが動かない
**問題**: `ComparisonSlider` が2枚目以降の画像で動作しない

**原因**: `originalImages` 配列の長さが `localImages` と一致しない

**解決策**: 
- `originalImages` 配列を生成時に `undefined` でパディング
- `original_other_images` がnullの場合のハンドリング

### 3. 認証リダイレクトループ
**問題**: Googleログイン後に無限リダイレクト

**解決策**:
1. SupabaseダッシュボードでリダイレクトURLを確認
2. `middleware.ts` のセッション更新ロジックを確認
3. `/auth/callback/route.ts` のエラーハンドリングを確認

### 4. 環境変数が読み込まれない
**問題**: Supabase接続エラー、Gemini APIエラー

**解決策**:
1. `.env.local` ファイルの存在確認
2. 変数名のプレフィックス確認 (`NEXT_PUBLIC_` はクライアント用)
3. Vercelの場合: Environment Variables設定を確認
4. 開発サーバー再起動

### 5. ドラッグ&ドロップが効かない
**問題**: 画像の並び替えができない

**解決策**:
- `DndContext` の設定を確認
- `SortableItem` の `id` がユニークであることを確認
- タッチデバイスの場合: `TouchSensor` の設定を確認

## デバッグ手法

### React DevTools
- コンポーネントツリーの確認
- Props/Stateの検査
- Hooksの状態確認

### ネットワークタブ
- API呼び出しの確認
- リクエスト/レスポンスの内容確認
- CORS エラーの検出

### Console
- `console.log` でデバッグ
- エラースタックトレースの確認
- Warning メッセージの確認

## パフォーマンス最適化

### 画像最適化
- `next/image` を使用 (`<img>` は避ける)
- 適切なサイズ指定
- lazy loadingの活用

### コンポーネント最適化
- `useMemo` で計算結果をキャッシュ
- `useCallback` でコールバック関数をメモ化
- 不要な再レンダリングを避ける

### API最適化
- 並列リクエストの活用
- 適切なエラーハンドリング
- ローディング状態の表示
