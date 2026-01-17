# 推奨コマンド

## 開発サーバー
```bash
npm run dev        # 開発サーバー起動 (http://localhost:3000)
```

## ビルド・本番
```bash
npm run build      # 本番ビルド (エラーチェック含む)
npm run start      # 本番サーバー起動
```

## コード品質
```bash
npm run lint       # ESLint実行
```

## Windows PowerShellコマンド
```powershell
Get-ChildItem       # ファイル一覧 (ls相当)
Set-Location        # ディレクトリ移動 (cd相当)
Remove-Item         # ファイル削除 (rm相当)
Select-String       # 文字列検索 (grep相当)
Get-Content         # ファイル内容表示 (cat相当)
```

## Git操作
```bash
git status                        # 状態確認
git add .                         # ステージング
git commit -m "feat: 機能追加"    # コミット (Conventional Commits)
git push                          # プッシュ
git checkout -b feature/xxx       # 機能ブランチ作成
git checkout develop              # developブランチへ切替
```

## 環境変数 (.env.local)
必要な環境変数:
- `NEXT_PUBLIC_SUPABASE_URL` - SupabaseプロジェクトURL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase Anonキー
- `GEMINI_API_KEY` - Google Gemini APIキー
- `NEXT_PUBLIC_YOUTUBE_VIDEO_ID` - チュートリアル動画ID (任意)
