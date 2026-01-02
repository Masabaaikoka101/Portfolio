/**
 * 商品解析API
 * Gemini AIを使用して商品画像からタイトル、説明文、価格を生成
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

export const runtime = "nodejs";

// ============================================================================
// Main API Handler
// ============================================================================
export async function POST(req: NextRequest) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("GEMINI_API_KEY is not configured");
        return NextResponse.json(
            { error: "APIキーが設定されていません" },
            { status: 503 }
        );
    }

    try {
        const formData = await req.formData();
        const file = formData.get("image") as File | null;
        const status = (formData.get("status") as string) || DEFAULTS.status;

        if (!file) {
            return NextResponse.json(
                { error: "画像が送信されていません" },
                { status: 400 }
            );
        }

        const buffer = await file.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString("base64");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: outputJsonSchema as any,
            },
        });

        const prompt = buildPrompt(status);

        // 最大2回試行（初回 + リトライ1回）
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
