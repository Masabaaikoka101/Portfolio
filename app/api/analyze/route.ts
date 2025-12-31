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

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
    あなたはプロのメルカリ出品ライターです。
    ユーザーがアップロードした商品画像を分析し、売れるための出品情報を生成してください。

    以下のJSON形式で出力してください：
    {
      "title": "40文字以内の魅力的で検索されやすいタイトル",
      "description": "商品の状態、特徴、魅力を伝える丁寧な商品説明文（検索用ハッシュタグも含める）",
      "category": "推定されるカテゴリー",
      "price": "市場相場に基づいた推定販売価格（数値のみ）",
      "tags": ["タグ1", "タグ2", "タグ3"]
    }

    画像から読み取れる情報はできるだけ詳細に反映させてください。
    `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: file.type,
                },
            },
        ]);

        const response = await result.response;
        const text = response.text();

        // Simple JSON extraction (in a real app, use structured output or more robust parsing)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("Failed to parse JSON from Gemini response");
        }

        const data = JSON.parse(jsonMatch[0]);

        return NextResponse.json(data);
    } catch (error) {
        console.error("Gemini API Error:", error);
        return NextResponse.json(
            { error: "Failed to process image" },
            { status: 500 }
        );
    }
}
