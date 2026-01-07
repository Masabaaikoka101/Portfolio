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
 * 白スタジオ用プロンプト
 */
const WHITE_STUDIO_PROMPT = `
この商品画像を、メルカリ出品用にプロフェッショナルに加工してください。

以下のルールを厳守してください：
1. 【商品の状態は絶対に変更しない】: 傷、汚れ、色味、形状など、商品の実際の状態を一切変更しないでください。
2. 【背景の白抜き】: 背景を清潔感のある白（または明るいグレー）に置き換えてください。
3. 【自然な影を追加】: 商品の下に自然な影を追加し、浮いている印象を無くしてください。
4. 【ライティング補正】: 商品が明るく見えるよう、自然なライティングを調整してください。
5. 【ECサイト品質】: メルカリやAmazonのような、プロのEC出品画像のクオリティを目指してください。

商品画像のみを出力してください。テキストは出力しないでください。
`;

/**
 * カスタム背景用プロンプト
 */
const CUSTOM_BACKGROUND_PROMPT = `
この商品画像を、提供された背景画像の上に自然に合成してください。

以下のルールを厳守してください：
1. 【商品の状態は絶対に変更しない】: 傷、汚れ、色味、形状など、商品の実際の状態を一切変更しないでください。
2. 【商品の向きを維持】: 商品の角度や向きは元の画像と同じにしてください。斜めに傾けたり、回転させたりしないでください。商品は正面から見た状態で垂直に配置してください。
3. 【商品を切り抜き】: 商品を元の背景から自然に切り抜いてください。
4. 【背景に自然に配置】: 提供された背景テクスチャの上に商品を自然に配置してください。商品は画像の中央に配置してください。
5. 【自然な影を追加】: 商品の下に背景に馴染む自然な影を追加してください。
6. 【ライティングの調和】: 商品と背景のライティングが調和するよう調整してください。
7. 【プロ品質】: 商品撮影のプロが撮影したような品質を目指してください。ECサイトの商品写真のように、商品が正面を向いている状態で撮影されたように見せてください。

商品画像のみを出力してください。テキストは出力しないでください。
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
            // 白スタジオ背景（従来通り）
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
