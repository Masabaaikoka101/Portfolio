/**
 * 画像編集API
 *
 * このAPIの役割:
 * - 商品画像をメルカリ出品用に最適化
 * - 背景の合成（白スタジオまたはテクスチャ背景）
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
 * - studio: 白スタジオ（純粋な白、余計な物体生成禁止）
 * - canvas, light-wood, dark-wood, marble: 提供されたテクスチャ画像を使用
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
type BackgroundType = "studio" | "canvas" | "dark-wood" | "light-wood" | "marble";

/**
 * 背景ファイルのマッピング
 */
const BACKGROUND_FILES: Record<Exclude<BackgroundType, "studio">, string> = {
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
 * パターン1：白背景（純粋な白のみ・余計な物体生成禁止）
 */
const WHITE_STUDIO_PROMPT = `
あなたはEコマース専門の画像処理AIです。
以下の商品画像の背景を、完全な白（#FFFFFF）に置換してください。

【入力データ】
- 商品画像：[画像の入力]

【絶対厳守ルール - 商品保護】
1. 商品（被写体）のピクセル情報は100%維持する。形状、色、質感、傷、汚れは一切変更しない。
2. 商品のトリミング、回転、変形は行わない。

【禁止事項 - 生成の抑制（重要）】
1. **余計な物体の描画禁止:** 商品以外のオブジェクト（植物、小道具、文具、装飾品、光の反射エフェクト、テキスト）は一切生成しない。
2. **背景の純粋化:** 背景にグラデーション、壁と床の境界線、タイルの継ぎ目などを描画しない。均一な白のみとする。

【合成・ライティング指示】
1. 背景は完全な白（#FFFFFF）とする。
2. 商品の下（接地面）にのみ、物理的に正確な「接地影（Contact Shadow）」を控えめに追加する。
3. 商品の周囲に広がる影（ドロップシャドウ）は最小限にし、画面端まで影を伸ばさない。

【出力】
商品と、その直下の影のみが含まれた画像
`;

/**
 * パターン2：リファレンス画像あり（背景テクスチャのみ・空間予測禁止）
 */
const TEXTURE_BACKGROUND_PROMPT = `
あなたはEコマース専門の画像処理AIです。
商品画像を、提供された「背景テクスチャ」の上に合成してください。

【入力データ】
- 商品画像：[画像の入力]
- 背景リファレンス画像：[テクスチャ画像の入力]

【絶対厳守ルール - 商品保護】
1. 商品（被写体）のピクセル情報は100%維持する。形状、色、質感、傷、汚れは一切変更しない。
2. 商品のトリミング、回転、変形は行わない。

【禁止事項 - 余白の予測生成禁止（最重要）】
1. **風景の捏造禁止:** 提供されたテクスチャ画像以外の要素（部屋の壁、窓、家具、他の雑貨、植物など）を背景の余白に絶対に描画しない。
2. **パターンの改変禁止:** 背景テクスチャの模様（木目や石目）を、商品に合わせて歪めたり、不自然に引き伸ばしたりしない。
3. **ノイズの混入禁止:** 何もない空間に、塵や光の粒子、レンズフレアなどを追加しない。

【合成・空間処理の指示】
1. **平面マッピング:** 提供された背景テクスチャを、商品が置かれている「平らな床面」として画面全体に適用する。奥行きによるボケ（被写界深度）は背景には適用せず、テクスチャを鮮明に保つ。
2. **影の生成:** 商品の形状に基づき、真上からの照明を想定した自然な落ち影のみを生成する。影は背景テクスチャの上に乗算（Multiply）で合成し、テクスチャの柄を塗りつぶさないようにする。

【出力】
指定されたテクスチャ背景上の商品画像のみ（余計な装飾なし）
`;

/**
 * 画像編集APIハンドラー
 */
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("image") as File;
        const backgroundType = (formData.get("backgroundType") as BackgroundType) || "studio"; // default to studio

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

        if (backgroundType === "studio") {
            // パターン1: 白スタジオ背景
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
                // @ts-expect-error - generationConfig type definition might be incomplete
                generationConfig: {
                    responseModalities: ["image"], // 画像のみ要求
                },
            });
        } else {
            // パターン2: テクスチャ背景
            const fileName = BACKGROUND_FILES[backgroundType];

            // 安全策: ファイルが存在しない場合はcanvasをデフォルトにする
            let backgroundPath = path.join(process.cwd(), "public", "backgrounds", fileName);
            if (!fs.existsSync(backgroundPath)) {
                console.warn(`Background file not found: ${fileName}. Falling back to default.`);
                // 万が一canvasすらなかったらエラーになるが、最低限canvasはある前提
                backgroundPath = path.join(process.cwd(), "public", "backgrounds", "canvas.jpeg");
            }

            // 背景画像を読み込み
            const backgroundBuffer = fs.readFileSync(backgroundPath);
            const base64Background = backgroundBuffer.toString("base64");

            result = await model.generateContent({
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: TEXTURE_BACKGROUND_PROMPT },
                            { text: "【商品画像】" },
                            {
                                inlineData: {
                                    data: base64Image,
                                    mimeType: file.type,
                                },
                            },
                            { text: "【背景リファレンス画像】" },
                            {
                                inlineData: {
                                    data: base64Background,
                                    mimeType: "image/jpeg",
                                },
                            },
                        ],
                    },
                ],
                // @ts-expect-error - generationConfig type definition might be incomplete
                generationConfig: {
                    responseModalities: ["image"], // 画像のみ要求
                },
            });
        }

        const response = await result.response;

        // レスポンスから画像パートを探す
        // Gemini 1.5/2.5 Flash outputs image in candidates[0].content.parts
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
