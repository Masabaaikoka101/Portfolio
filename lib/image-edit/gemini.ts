import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from "@google/genai";
import { ImageEditError, type BackgroundType, type EditImageInput, type ImageEditProvider } from "./types";

/**
 * Gemini の画像モデルで背景を置き換える（従来の実装）。
 * 2026-11 時点で画像モデルに無料枠はなく、有料キーが必要。
 */
const DEFAULT_MODEL = "gemini-3.1-flash-image-preview";

const PRODUCT_PROTECTION_RULES = `
【絶対厳守ルール - 商品保護】
1. 商品自体には一切の変更を加えないでください
2. 商品の形状、色、テクスチャ、細部（金具、ボタン、ロゴ、タグ、ストラップ、傷、汚れ、しわ等）を完全に保持してください
3. 商品の全てのピクセルを元のまま維持してください
4. 商品を回転、傾斜、拡大、縮小しないでください
5. 商品の一部を省略したり、隠したりしないでください
`;

const PROMPTS: Record<BackgroundType, string> = {
    white: `
この画像の背景のみを白い撮影スタジオ背景に置き換えてください。

${PRODUCT_PROTECTION_RULES}

【背景処理】
- 背景のみを白（#FFFFFF）に置き換え
- 商品を画像の中央に配置
- 商品をまっすぐに配置
- 商品の下に自然な影を追加

商品画像のみを出力してください。
`,
    canvas: `
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
    marble: `
    この画像の背景を「大理石（マーブル）」の背景テクスチャに置き換えてください。

    ${PRODUCT_PROTECTION_RULES}

    【背景処理】
    - 提供された大理石画像のテクスチャと色味を使用
    - 商品を画像の中央に配置し、まっすぐに調整
    - 石の質感に馴染むような、シャープで自然な影を追加
    - 高級感と清涼感のある雰囲気に仕上げる
    - 商品画像のみを出力
    `,
};

const SAFETY_SETTINGS = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export function createGeminiProvider(): ImageEditProvider {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL;
    const genAI = new GoogleGenAI({ apiKey: apiKey || "" });

    return {
        name: `gemini:${model}`,
        async edit({ image, mimeType, backgroundType, background }: EditImageInput) {
            if (!apiKey) throw new ImageEditError("GEMINI_API_KEY が設定されていません");

            const parts = background
                ? [
                      { text: PROMPTS[backgroundType] },
                      { text: "【商品画像】" },
                      { inlineData: { data: image.toString("base64"), mimeType } },
                      { text: "【背景画像】" },
                      { inlineData: { data: background.toString("base64"), mimeType: "image/jpeg" } },
                  ]
                : [{ text: PROMPTS[backgroundType] }, { inlineData: { data: image.toString("base64"), mimeType } }];

            const response = await genAI.models.generateContent({
                model,
                contents: [{ role: "user", parts }],
                config: { responseModalities: ["image"], safetySettings: SAFETY_SETTINGS },
            });

            const candidate = response.candidates?.[0];
            for (const part of candidate?.content?.parts || []) {
                if (part.inlineData?.data) {
                    return { dataUrl: `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}` };
                }
            }
            throw new ImageEditError(`Gemini returned no image (finishReason: ${candidate?.finishReason ?? "unknown"})`);
        },
    };
}
