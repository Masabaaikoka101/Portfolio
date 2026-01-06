/**
 * 画像編集API
 *
 * このAPIの役割:
 * - 商品画像をメルカリ出品用に最適化
 * - 背景の白抜き、影の追加、ライティング補正
 *
 * Why 画像編集をAIで行うのか:
 * - 従来の画像処理では複雑な背景除去が困難
 * - AIなら「メルカリっぽい画像」を理解して生成できる
 * - ユーザーの手間を大幅削減
 *
 * エンドポイント:
 * - POST /api/edit-image
 * - Content-Type: multipart/form-data
 * - Body: image (File)
 *
 * レスポンス:
 * - 成功: { success: true, imageUrl: "data:image/..." }
 * - 失敗: { success: false, error: "..." }
 *
 * Note:
 * - この機能は失敗しても出品自体は可能
 * - フロントエンドでフォールバック処理あり
 *
 * Learning:
 * - Gemini Image Generation: https://ai.google.dev/gemini-api/docs/image-generation
 * - gemini-2.5-flash-image モデル
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Gemini クライアント
 *
 * Why ファイルスコープで初期化するのか:
 * - リクエストごとに再初期化するオーバーヘッドを削減
 * - コネクション再利用によるパフォーマンス向上
 */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * 画像編集APIハンドラー
 *
 * 処理フロー:
 * 1. FormDataから画像を取得
 * 2. 画像をBase64に変換
 * 3. Gemini Image APIで画像生成
 * 4. 生成された画像をBase64 Data URLで返却
 *
 * プロンプト設計のポイント:
 * - 「商品の状態は変更しない」を最初に強調
 * - 具体的な処理内容を番号付きで列挙
 * - 期待するクオリティを明示（EC出品画像レベル）
 */
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("image") as File;

        if (!file) {
            return NextResponse.json(
                { error: "No image provided" },
                { status: 400 }
            );
        }

        // 画像をBase64に変換
        const buffer = await file.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString("base64");

        /**
         * 画像生成モデル
         *
         * Why gemini-2.5-flash-imageを使うのか:
         * - 画像入力→画像出力に対応
         * - 高品質な画像編集が可能
         * - gemini-2.5-flashでは画像出力ができない
         */
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

        /**
         * 画像編集プロンプト
         *
         * Why このプロンプト構造か:
         * - 最重要ルール（商品状態の維持）を最初に記載
         * - 具体的な処理を番号付きで明示
         * - 禁止事項（テキスト出力）を明記
         */
        const prompt = `
この商品画像を、メルカリ出品用にプロフェッショナルに加工してください。

以下のルールを厳守してください：
1. 【商品の状態は絶対に変更しない】: 傷、汚れ、色味、形状など、商品の実際の状態を一切変更しないでください。
2. 【背景の白抜き】: 背景を清潔感のある白（または明るいグレー）に置き換えてください。
3. 【自然な影を追加】: 商品の下に自然な影を追加し、浮いている印象を無くしてください。
4. 【ライティング補正】: 商品が明るく見えるよう、自然なライティングを調整してください。
5. 【ECサイト品質】: メルカリやAmazonのような、プロのEC出品画像のクオリティを目指してください。

商品画像のみを出力してください。テキストは出力しないでください。
`;

        const result = await model.generateContent({
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: prompt },
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
                /**
                 * responseModalities
                 *
                 * Why @ts-expect-errorを使うのか:
                 * - この設定は正式なSDKの型定義に含まれていない
                 * - しかしAPI自体はこのオプションをサポートしている
                 * - 型定義の更新を待つ間、エラーを抑制
                 */
                // @ts-expect-error - responseModalities is a valid config for image generation
                responseModalities: ["image", "text"],
            },
        });

        const response = await result.response;

        // レスポンスから画像パートを探す
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                const imageData = part.inlineData.data;
                const mimeType = part.inlineData.mimeType || "image/png";

                // Base64 Data URLとして返却
                return NextResponse.json({
                    success: true,
                    imageUrl: `data:${mimeType};base64,${imageData}`,
                });
            }
        }

        // 画像が生成されなかった場合
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
