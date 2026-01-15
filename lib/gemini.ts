/**
 * Gemini AI 関連ユーティリティ
 *
 * このファイルの役割:
 * - Gemini APIとのやり取りに必要なスキーマ、プロンプト、バリデーションを集約
 * - API routeから抽出したロジックを一元管理
 *
 * Why このファイルを分離するのか:
 * - API routeをシンプルに保ち、テスタビリティを向上
 * - プロンプトの変更が頻繁に発生するため、管理しやすい場所に集約
 * - Zodスキーマを共有することで、型安全を担保
 *
 * Alternatives:
 * - OpenAI API: 候補だったが、Geminiの方がマルチモーダル（画像+テキスト）が得意
 * - Claude API: 高品質だが、画像解析のコストが高い
 * - LangChain: 抽象化レイヤーとして検討したが、直接APIを叩く方がシンプル
 *
 * Learning:
 * - Gemini API Docs: https://ai.google.dev/docs
 * - Structured Output: https://ai.google.dev/gemini-api/docs/structured-output
 * - Zod: https://zod.dev/
 */

import { z } from "zod";
import { SchemaType } from "@google/generative-ai";
import {
    PRICE_LIMITS,
    TITLE_MAX_LENGTH,
    HASHTAG_LIMITS,
    REQUIRED_DISCLAIMERS,
} from "@/lib/constants";

// ============================================================================
// フィールド定義 - 単一の信頼できる情報源（Single Source of Truth）
// ============================================================================
/**
 * Gemini出力フィールドの定義
 *
 * Why この構造か:
 * - Zodスキーマ、JSONスキーマ、プロンプトで同じ定義を共有
 * - 変更時に1箇所を修正するだけで全体に反映される
 * - DRY原則（Don't Repeat Yourself）の実践
 *
 * Learning:
 * - Single Source of Truth パターン
 */
export const FIELD_DEFINITIONS = {
    item_title: {
        description: "メルカリ用商品タイトル（40文字以内）",
        maxLength: TITLE_MAX_LENGTH,
    },
    description: {
        description: "商品説明文（改行を含むテキスト）",
    },
    hashtags: {
        description: `ハッシュタグ（${HASHTAG_LIMITS.recommended.min}〜${HASHTAG_LIMITS.recommended.max}個）`,
        minItems: HASHTAG_LIMITS.min,
        maxItems: HASHTAG_LIMITS.max,
    },
    price: {
        description: `推定価格（${PRICE_LIMITS.min.toLocaleString()}〜${PRICE_LIMITS.max.toLocaleString()}の整数。出品不可の場合は0）`,
        min: 0, // 出品不可の場合は0を許容するため0に変更
        max: PRICE_LIMITS.max,
    },
    prohibited: {
        description: "出品禁止物の疑いがあるかどうか",
    },
    prohibited_reason: {
        description: "禁止物の場合、その理由（短文）",
    },
} as const;

// ... (skip to GeminiOutputSchema)

export const GeminiOutputSchema = z.object({
    /** 商品タイトル（40文字制限） */
    item_title: z.string().max(FIELD_DEFINITIONS.item_title.maxLength, "item_titleは40文字以内"),
    /** 商品説明文 */
    description: z.string(),
    /** ハッシュタグ配列 */
    hashtags: z
        .array(z.string())
        .min(FIELD_DEFINITIONS.hashtags.minItems)
        .max(FIELD_DEFINITIONS.hashtags.maxItems),
    /** 推定価格 */
    price: z
        .number()
        .int()
        .min(0), // 0を許容
    /** 出品禁止物フラグ */
    prohibited: z.boolean(),
    /** 禁止理由 */
    prohibited_reason: z.string().optional().default(""),
});

// ... (skip to buildPrompt)

export function buildPrompt(status: string): string {
    return `# 役割
あなたはフリマアプリ「メルカリ」の出品マスターです。
ユーザーがアップロードした画像を解析し、選択された「商品の状態」に基づいて、誠実かつ売れやすい商品説明データを生成します。

# 入力データ
- 商品画像: 添付の画像
- 商品の状態: ${status}

# 厳守ルール

## 1. 捏造の禁止
- ユーザーから具体的なダメージ（傷、汚れ、スレ、動作不備など）の指示がない限り、AIの判断で勝手にネガティブな情報を追加しないでください。
- 不確実な情報は「詳細不明」と記載してください。

## 2. 状態の反映
入力された「${status}」に準じた表現を行ってください。
- 「新品、未使用」の場合：保管状態が良いことを強調
- 「目立った傷や汚れなし」などの場合：一般的な中古品の範囲内である丁寧な表現を使用

## 3. 商品説明文のフォーマット（最重要・厳守）
商品説明（description）は、**必ず以下の3つのセクションのみ**で構成してください。
**独自のセクション（「商品の詳細」「商品情報」など）を追加することは禁止です。**

---
【商品概要】
ご覧いただきありがとうございます。
[商品の特徴や仕様、色、素材、機能などを記載]

【商品の状態】
状態：${status}
[状態に関する補足文]

【注意事項】
${REQUIRED_DISCLAIMERS.storage}
${REQUIRED_DISCLAIMERS.purchase}
---

**セクション名は「【商品概要】」「【商品の状態】」「【注意事項】」の3つのみ使用してください。**

## 4. 画像からの抽出
画像からブランド名、型番、色、素材、特徴などを可能な限り読み取り、【商品概要】セクションに反映してください。

## 5. 禁止物チェック
出品禁止物（偽ブランド品、医薬品、危険物など）の疑いがある場合は、prohibited を true にして prohibited_reason に短く理由を記載してください。

## 6. 価格
- 原則として ${PRICE_LIMITS.min.toLocaleString()}〜${PRICE_LIMITS.max.toLocaleString()} の整数で設定してください。
- **出品禁止物（prohibited=true）や、価格の推定が困難な場合、または詳細不明な場合は「0」を設定してください（9,999,999にはしないでください）。**
- 相場がわからない場合は一般的な中古相場を参考にしてください。

## 7. タイトル
- ${TITLE_MAX_LENGTH}文字以内に収めてください。
- ブランド名、商品名、特徴を含めてください。

## 8. ハッシュタグ
- ${HASHTAG_LIMITS.recommended.min}〜${HASHTAG_LIMITS.recommended.max}個を目安に生成してください。
- 各タグは # で始めてください。

## 9. 説明文の注意
- 説明文内では波括弧 { } を使用しないでください（JSON出力が壊れる原因になります）。
- 改行は実際の改行文字で表現してください。

# 出力形式
JSONのみを出力してください。前置き、挨拶、コードフェンス（\`\`\`）は一切不要です。

出力するJSONの構造:
{
  "item_title": "商品タイトル（${TITLE_MAX_LENGTH}文字以内）",
  "description": "【商品概要】\\nご覧いただきありがとうございます。\\n[商品の説明]\\n\\n【商品の状態】\\n状態：${status}\\n[補足文]\\n\\n【注意事項】\\n${REQUIRED_DISCLAIMERS.storage}\\n${REQUIRED_DISCLAIMERS.purchase}",
  "hashtags": ["#タグ1", "#タグ2", "#タグ3"],
  "price": 推定価格（整数。不明また禁止物は0）,
  "prohibited": false,
  "prohibited_reason": ""
}`;
}

// ... (skip to validateAndNormalize)

export function validateAndNormalize(data: unknown): GeminiOutput {
    const parsed = GeminiOutputSchema.parse(data);

    // タイトルを40文字に制限
    if (parsed.item_title.length > TITLE_MAX_LENGTH) {
        parsed.item_title = parsed.item_title.substring(0, TITLE_MAX_LENGTH);
    }

    // ハッシュタグを最大10個に制限
    if (parsed.hashtags.length > HASHTAG_LIMITS.recommended.max) {
        parsed.hashtags = parsed.hashtags.slice(0, HASHTAG_LIMITS.recommended.max);
    }

    // 価格を範囲内に収める（0の場合は維持）
    if (parsed.price !== 0) {
        if (parsed.price < PRICE_LIMITS.min) parsed.price = PRICE_LIMITS.min;
        if (parsed.price > PRICE_LIMITS.max) parsed.price = PRICE_LIMITS.max;
    }

    // 必須フレーズのチェック・追加
    if (!parsed.description.includes(REQUIRED_DISCLAIMERS.storage)) {
        parsed.description = parsed.description.trim() +
            "\n\n【注意事項】\n" +
            REQUIRED_DISCLAIMERS.storage + "\n" +
            REQUIRED_DISCLAIMERS.purchase;
    } else if (!parsed.description.includes(REQUIRED_DISCLAIMERS.purchase)) {
        parsed.description = parsed.description.trim() + "\n" + REQUIRED_DISCLAIMERS.purchase;
    }

    // prohibited が true なのに reason が空の場合
    if (parsed.prohibited && !parsed.prohibited_reason) {
        parsed.prohibited_reason = "出品禁止物の可能性があります";
    }

    return parsed;
}

// ============================================================================
// Transform to Frontend Response
// ============================================================================
/**
 * Gemini出力をフロントエンド用レスポンスに変換
 *
 * Why 変換が必要か:
 * - Gemini出力はスネークケース（item_title, prohibited_reason）
 * - フロントエンドはキャメルケース（title, prohibitedReason）を期待
 * - 命名規則の違いを吸収するDTO（Data Transfer Object）
 *
 * @param data - バリデーション済みのGeminiOutput
 * @returns フロントエンド用レスポンス
 */
export function toFrontendResponse(data: GeminiOutput): FrontendResponse {
    return {
        title: data.item_title,
        description: data.description,
        price: data.price,
        tags: data.hashtags,
        prohibited: data.prohibited,
        prohibitedReason: data.prohibited_reason,
    };
}
