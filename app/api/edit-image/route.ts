import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import * as fs from "fs";
import * as path from "path";

/**
 * 背景タイプの定義
 */
type BackgroundType = "white" | "canvas" | "dark-wood" | "light-wood" | "marble";

/**
 * 背景ファイルのマッピング
 */
const BACKGROUND_FILES: Record<Exclude<BackgroundType, "white">, string> = {
    canvas: "canvas.jpeg",
    "dark-wood": "dark-wood.jpeg",
    "light-wood": "light-wood.jpeg",
    marble: "marble.jpeg",
};

/**
 * Gemini クライアント (New SDK)
 */
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * 共通の絶対厳守ルール（商品保護）
 */
const PRODUCT_PROTECTION_RULES = `
【絶対厳守ルール - 商品保護】
1. 商品自体には一切の変更を加えないでください
2. 商品の形状、色、テクスチャ、細部（金具、ボタン、ロゴ、タグ、ストラップ、傷、汚れ、しわ等）を完全に保持してください
3. 商品の全てのピクセルを元のまま維持してください
4. 商品を回転、傾斜、拡大、縮小しないでください
5. 商品の一部を省略したり、隠したりしないでください
`;

/**
 * 白スタジオ用プロンプト
 */
const WHITE_STUDIO_PROMPT = `
この画像の背景のみを白い撮影スタジオ背景に置き換えてください。

${PRODUCT_PROTECTION_RULES}

【背景処理】
- 背景のみを白（#FFFFFF）に置き換え
- 商品を画像の中央に配置
- 商品をまっすぐに配置
- 商品の下に自然な影を追加

商品画像のみを出力してください。
`;

/**
 * 背景タイプごとのカスタムプロンプト（ラベル対応）
 */
const BACKGROUND_PROMPTS: Record<string, string> = {
    "white": WHITE_STUDIO_PROMPT,
    "canvas": `
    この画像の背景を「キャンバス（布地）」の背景テクスチャに置き換えてください。

    ${PRODUCT_PROTECTION_RULES}

    【背景処理】
    - 提供されたキャンバス画像のテクスチャと色味を使用
    - 商品を画像の中央に配置し、まっすぐに調整
    - 布地の質感に馴染むような、自然で柔らかな影を追加
    - 商品画像のみを出力
    `,
    "dark-wood": `
    この画像の背景を「ダークウッド（暗い木目）」の背景テクスチャに置き換えてください。

    ${PRODUCT_PROTECTION_RULES}

    【背景処理】
    - 提供されたダークウッド画像のテクスチャと色味を使用
    - 商品を画像の中央に配置し、まっすぐに調整
    - 木目の質感に馴染むような、深みのある自然な影を追加
    - 高級感のある落ち着いた雰囲気に仕上げる
    - 商品画像のみを出力
    `,
    "light-wood": `
    この画像の背景を「ライトウッド（明るい木目）」の背景テクスチャに置き換えてください。

    ${PRODUCT_PROTECTION_RULES}

    【背景処理】
    - 提供されたライトウッド画像のテクスチャと色味を使用
    - 商品を画像の中央に配置し、まっすぐに調整
    - 木目の質感に馴染むような、明るく自然な影を追加
    - 清潔感のあるナチュラルな雰囲気に仕上げる
    - 商品画像のみを出力
    `,
    "marble": `
    この画像の背景を「大理石（マーブル）」の背景テクスチャに置き換えてください。

    ${PRODUCT_PROTECTION_RULES}

    【背景処理】
    - 提供された大理石画像のテクスチャと色味を使用
    - 商品を画像の中央に配置し、まっすぐに調整
    - 石の質感に馴染むような、シャープで自然な影を追加
    - 高級感と清涼感のある雰囲気に仕上げる
    - 商品画像のみを出力
    `
};

/**
 * デフォルトのカスタム背景プロンプト（未定義の場合）
 */
const DEFAULT_CUSTOM_PROMPT = `
この商品画像の背景を、提供された背景テクスチャに置き換えてください。

${PRODUCT_PROTECTION_RULES}

【背景置換処理】
- 元の背景のみを提供された背景テクスチャに置き換え
- 商品を画像の中央に配置
- 商品をまっすぐに配置
- 商品の下に背景に馴染む自然な影を追加
- 商品と背景のライティングを調和させる

商品画像のみを出力してください。
`;

function normalizePathForLog(p: string) {
    return path.relative(process.cwd(), p);
}

export async function POST(req: NextRequest) {
    console.log("[API] /api/edit-image called");
    try {
        const formData = await req.formData();
        const file = formData.get("image") as File;
        const backgroundType = (formData.get("backgroundType") as BackgroundType) || "white";

        if (!file) {
            return NextResponse.json(
                { error: "No image provided" },
                { status: 400 }
            );
        }

        const buffer = await file.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString("base64");

        // 型定義に合わないとエラーになる可能性があるためanyで受けるか、SDKの型を確認すべきだが
        // ここではビルドエラー回避のため一旦anyを使わず推論に任せる
        let response;

        if (backgroundType === "white") {
            response = await genAI.models.generateContent({
                model: "gemini-2.5-flash-image",
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: WHITE_STUDIO_PROMPT },
                            {
                                inlineData: {
                                    data: base64Image,
                                    mimeType: file.type,
                                },
                            },
                        ],
                    },
                ],
                config: {
                    responseModalities: ["image"],
                    safetySettings: [
                        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },

                    ],
                },
            });
        } else {
            const backgroundPath = path.join(
                process.cwd(),
                "public",
                "backgrounds",
                BACKGROUND_FILES[backgroundType]
            );

            if (!fs.existsSync(backgroundPath)) {
                throw new Error(`Background file not found: ${normalizePathForLog(backgroundPath)}`);
            }
            const backgroundBuffer = fs.readFileSync(backgroundPath);
            const base64Background = backgroundBuffer.toString("base64");

            const promptText = BACKGROUND_PROMPTS[backgroundType] || DEFAULT_CUSTOM_PROMPT;

            response = await genAI.models.generateContent({
                model: "gemini-2.5-flash-image",
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: promptText },
                            { text: "【商品画像】" },
                            {
                                inlineData: {
                                    data: base64Image,
                                    mimeType: file.type,
                                },
                            },
                            { text: "【背景画像】" },
                            {
                                inlineData: {
                                    data: base64Background,
                                    mimeType: "image/jpeg",
                                },
                            },
                        ],
                    },
                ],
                config: {
                    responseModalities: ["image"],
                    safetySettings: [
                        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    ],
                },
            });
        }

        const candidate = response.candidates?.[0];
        console.log("[API] Gemini Response Candidate:", JSON.stringify({
            finishReason: candidate?.finishReason,
            safetyRatings: candidate?.safetyRatings,
            contentPartsCount: candidate?.content?.parts?.length,
            fullResponse: process.env.NODE_ENV === 'development' ? JSON.stringify(response) : undefined
        }, null, 2));

        const parts = candidate?.content?.parts || [];
        for (const part of parts) {
            if (part.inlineData) {
                const imageData = part.inlineData.data;
                const mimeType = part.inlineData.mimeType || "image/png";

                return NextResponse.json({
                    success: true,
                    imageUrl: `data:${mimeType};base64,${imageData}`,
                });
            }
        }

        return NextResponse.json(
            { error: "No image generated in response", success: false },
            { status: 500 }
        );

    } catch (error) {
        console.error("Gemini Image API Error (New SDK):", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        return NextResponse.json(
            {
                error: "Failed to process image",
                details: error instanceof Error ? error.message : String(error),
                success: false
            },
            { status: 500 }
        );
    }
}
