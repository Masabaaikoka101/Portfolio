import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

        const buffer = await file.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString("base64");

        // Use gemini-2.5-flash-image for image editing
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

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
                // @ts-expect-error - responseModalities is a valid config for image generation
                responseModalities: ["image", "text"],
            },
        });

        const response = await result.response;

        // Find the image part in the response
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                const imageData = part.inlineData.data;
                const mimeType = part.inlineData.mimeType || "image/png";

                // Return as base64 data URL
                return NextResponse.json({
                    success: true,
                    imageUrl: `data:${mimeType};base64,${imageData}`,
                });
            }
        }

        // If no image was generated, return error
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
