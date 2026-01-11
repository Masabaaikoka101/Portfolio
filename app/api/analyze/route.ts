/**
 * 商品解析API
 *
 * このAPIの役割:
 * - 商品画像からタイトル、説明文、価格をAI生成
 * - Gemini AIを使用したマルチモーダル処理
 *
 * Why サーバーサイドで処理するのか:
 * - APIキーをクライアントに公開しない（セキュリティ）
 * - 大きな画像データをサーバーで処理（パフォーマンス）
 * - リトライロジックをサーバーで一元管理
 *
 * エンドポイント:
 * - POST /api/analyze
 * - Content-Type: multipart/form-data
 * - Body: image (File), status (string)
 *
 * レスポンス:
 * - 成功: { title, description, price, tags, prohibited, prohibitedReason }
 * - 失敗: { error, detail? }
 *
 * Learning:
 * - Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 * - Gemini AI: https://ai.google.dev/docs
 * - Structured Output: https://ai.google.dev/gemini-api/docs/structured-output
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { DEFAULTS } from "@/lib/constants";
import {
    outputJsonSchema,
    buildPrompt,
    buildRetryPrompt,
    parseJsonSafe,
    validateAndNormalize,
    toFrontendResponse,
} from "@/lib/gemini";

/**
 * ランタイム設定
 *
 * Why "nodejs"を指定するのか:
 * - Edge Runtimeでは一部のNode.js APIが使えない
 * - Bufferを使用するため、Node.jsランタイムが必要
 */
export const runtime = "nodejs";

// ============================================================================
// Main API Handler
// ============================================================================
/**
 * 商品解析APIハンドラー
 *
 * 処理フロー:
 * 1. APIキーの存在確認
 * 2. FormDataから画像とステータスを取得
 * 3. 画像をBase64に変換
 * 4. Gemini AIでテキスト生成（最大2回試行）
 * 5. レスポンスをパース・バリデーション
 * 6. フロントエンド用に変換して返却
 *
 * エラーハンドリング:
 * - 503: APIキー未設定
 * - 400: 画像未送信
 * - 502: AI処理エラー
 */
export async function POST(req: NextRequest) {
    const apiKey = process.env.GEMINI_API_KEY;

    // APIキーの存在確認
    if (!apiKey) {
        console.error("GEMINI_API_KEY is not configured");
        return NextResponse.json(
            { error: "APIキーが設定されていません" },
            { status: 503 }
        );
    }

    try {
        // FormDataから入力を取得
        const formData = await req.formData();
        const file = formData.get("image") as File | null;
        const status = (formData.get("status") as string) || DEFAULTS.status;

        if (!file) {
            return NextResponse.json(
                { error: "画像が送信されていません" },
                { status: 400 }
            );
        }

        // 画像をBase64に変換（Gemini APIに渡すため）
        const buffer = await file.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString("base64");

        // Gemini クライアント初期化
        const genAI = new GoogleGenerativeAI(apiKey);

        /**
         * モデル設定
         *
         * Why gemini-2.5-flashを使うのか:
         * - 高速かつ低コスト
         * - Structured Output対応
         * - マルチモーダル（画像+テキスト）対応
         */
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                responseSchema: outputJsonSchema as any,
            },
        });

        const prompt = buildPrompt(status);

        /**
         * リトライロジック
         *
         * Why 2回試行するのか:
         * - AIは時々不正なJSONを返すことがある
         * - リトライプロンプトでエラー理由を伝えると成功率が上がる
         * - 2回失敗したら諦めてエラーを返す
         */
        let lastError = "";
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const currentPrompt = attempt === 0
                    ? prompt
                    : buildRetryPrompt(status, lastError);

                const result = await model.generateContent([
                    currentPrompt,
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: file.type,
                        },
                    },
                ]);

                const response = await result.response;
                const text = response.text();

                // JSONパース → バリデーション → フロントエンド用変換
                const rawData = parseJsonSafe(text);
                const validated = validateAndNormalize(rawData);

                return NextResponse.json(toFrontendResponse(validated));
            } catch (parseError) {
                lastError = parseError instanceof Error
                    ? parseError.message
                    : "不明なエラー";
                console.error(`Attempt ${attempt + 1} failed:`, lastError);

                if (attempt === 1) {
                    throw new Error(`JSON解析に2回失敗しました: ${lastError}`);
                }
            }
        }

        throw new Error("予期しないエラー");
    } catch (error) {
        console.error("Gemini API Error:", error);
        const message = error instanceof Error ? error.message : "不明なエラー";
        return NextResponse.json(
            { error: "画像の処理に失敗しました", detail: message },
            { status: 502 }
        );
    }
}
