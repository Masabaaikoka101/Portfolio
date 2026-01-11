---
trigger: always_on
---

# Project Rules (Fixed)

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4

## Antigravity Process Protocol (Strict)
**ファイル変更時は、以下のAntigravity機能を必ず使用すること。**
- **Implementation Plan**: 変更前の設計・計画提示（必須）。
- **Task**: タスク分解と実行。
- **Walkthrough**: 変更点の解説と検証報告。
- **禁止事項**: 計画なしのコード変更、確認なしのファイル保存。

## Git & GitHub 運用プロトコル (Strict)
**以下のルールを厳守し、都度確認を行わずに適用してください。**

### 1. テンプレート利用義務
- **Issue**: 新規タスクは `.github/ISSUE_TEMPLATE/` に従う。
- **PR**: PR作成時は `.github/pull_request_template.md` を読み込み、全ての項目を埋める。

### 2. ブランチ戦略 (Git Flow)
- **Base**: 常に `develop` から派生。
- **Naming**: `id/{3桁ID}-{機能概要(ケバブケース)}`
    - 例: `id/002-add-login`
    - IDはIssue番号を3桁ゼロ埋め。機能名は動詞から始める英単語。

### 3. コミットメッセージ (Conventional Commits)
- **Format**: `type(scope): subject`
- **Subject**: 日本語。
- **Body**: "How"（実装詳細）ではなく **"Why"（変更の意図・理由）** を書くこと。