/**
 * 画像編集API
 *
 * このAPIの役割:
 * - 商品画像をメルカリ出品用に最適化
 * - 背景の合成（白スタジオまたはカスタム背景）
 *
 * Why 画像編集をAIで行うのか:
 * - 従来の画像処理では複雑な背景合成が困難
 * - AIなら参照画像を見て自然に合成できる
 * - ユーザーの手間を大幅削減
 *
 * エンドポイント:
 * - POST /api/edit-image
 * - Content-Type: multipart/form-data
 * - Body: image (File), backgroundType (string)
 *
 * 背景タイプ:
 * - white: 白スタジオ（AI生成）
 * - canvas: キャンバス生地
 * - dark-wood: ダークウッド
 * - light-wood: ライトウッド
 * - marble: 大理石
 *
 * Learning:
 * - Gemini Image Generation: https://ai.google.dev/gemini-api/docs/image-generation
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
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
 * Gemini クライアント
 */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * 共通の絶対厳守ルール（商品保護）
 */
const PRODUCT_PROTECTION_RULES = `
【絶対厳守ルール - 商品保護】
1. 商品自体には一切の変更を加えないでください
2. 商品の形状、色、テクスチャ、細部（金具、ボタン、ロゴ、タグ、ストラップ等）を完全に保持してください
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
 * カスタム背景用プロンプト
 */
const CUSTOM_BACKGROUND_PROMPT = `
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

/**
 * 画像編集APIハンドラー
 */
export async function POST(req: NextRequest) {
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

        // 商品画像をBase64に変換
        const buffer = await file.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString("base64");

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

        let result;

        if (backgroundType === "white") {
            // 白スタジオ背景
            result = await model.generateContent({
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
                generationConfig: {
                    // @ts-expect-error - responseModalities is valid for image generation
                    responseModalities: ["image", "text"],
                },
            });
        } else {
            // カスタム背景
            const backgroundPath = path.join(
                process.cwd(),
                "public",
                "backgrounds",
                BACKGROUND_FILES[backgroundType]
            );

            // 背景画像を読み込み
            const backgroundBuffer = fs.readFileSync(backgroundPath);
            const base64Background = backgroundBuffer.toString("base64");

            result = await model.generateContent({
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: CUSTOM_BACKGROUND_PROMPT },
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
                generationConfig: {
                    // @ts-expect-error - responseModalities is valid for image generation
                    responseModalities: ["image", "text"],
                },
            });
        }

        const response = await result.response;

        // レスポンスから画像パートを探す
        for (const part of response.candidates?.[0]?.content?.parts || []) {
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
            { error: "No image generated", success: false },
            { status: 500 }
        );
    } catch (error) {
        console.error("Gemini Image API Error:", error);
        return NextResponse.json(
            { error: "Failed to process image", success: false },
            { status: 500 }
        );
    }
}
