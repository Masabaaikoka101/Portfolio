---
description: IssueIDからブランチ作成して開始
---

# Start Task Workflow (Instant)

**Trigger**: `/start [IssueID] [概要]`
**Example**: `/start 2 ログイン機能の実装`

**Steps**:
1. **Format Branch Name**:
    - `IssueID` を3桁ゼロ埋めにする（`2` → `002`）。
    - `概要` を動詞始まりの英単語ケバブケースに翻訳する（`ログイン機能の実装` → `add-login-feature`）。
    - ブランチ名 `id/{ID}-{概要}` を生成する。

2. **Git Operation**:
    - 以下のコマンド実行計画を立て、確認後実行する。
        ```bash
        git checkout develop
        git pull origin develop
        git checkout -b id/{生成したブランチ名}
        ```

3. **Confirmation**:
    - 作成完了を報告し、「Implementation Plan（実装計画）」の作成フェーズへ移行するよう促す。