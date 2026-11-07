import sharp from "sharp";
import { ImageEditError, type BackgroundType, type EditImageInput, type ImageEditProvider } from "./types";

/**
 * Cloudflare Workers AI の FLUX.2 [klein] 4B で背景だけを置き換える。
 *
 * - 無料枠: 1日 10,000 neurons（00:00 UTC リセット）。1024px 出力・入力2枚で約115 neurons/枚 ≒ 約85枚/日。
 * - 参照画像は最大4枚、各 512x512 未満でないと受け付けないため、送る前に縮小する。
 * - ライセンス: Apache-2.0（商用利用可）。
 */
const DEFAULT_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
const INPUT_MAX = 511;
const OUTPUT_LONG_EDGE = 1024;
const REQUEST_TIMEOUT_MS = 40_000;

const KEEP_PRODUCT =
    "Keep the product from image 0 exactly as it is: same shape, colors, logos, text, scratches, stains and wear. " +
    "Do not redraw, retouch, clean, rotate or resize the product.";

const PROMPTS: Record<BackgroundType, string> = {
    white: `Replace only the background of image 0 with a clean pure white photo studio backdrop, and add a soft natural shadow under the product. ${KEEP_PRODUCT}`,
    canvas: `Place the product from image 0 on the canvas fabric surface shown in image 1. Replace only the background with the texture and color of image 1 and add a soft natural shadow. ${KEEP_PRODUCT}`,
    "dark-wood": `Place the product from image 0 on the dark wood surface shown in image 1. Replace only the background with the wood texture and color of image 1 and add a natural shadow. ${KEEP_PRODUCT}`,
    "light-wood": `Place the product from image 0 on the light wood surface shown in image 1. Replace only the background with the wood texture and color of image 1 and add a natural shadow. ${KEEP_PRODUCT}`,
    marble: `Place the product from image 0 on the marble surface shown in image 1. Replace only the background with the marble texture and color of image 1 and add a natural shadow. ${KEEP_PRODUCT}`,
};

async function toSmallJpeg(buf: Buffer): Promise<Buffer> {
    return sharp(buf).rotate().resize(INPUT_MAX, INPUT_MAX, { fit: "inside" }).jpeg({ quality: 90 }).toBuffer();
}

/** 元画像の縦横比を保ったまま長辺 1024px・16の倍数に揃える */
async function outputSize(buf: Buffer): Promise<[number, number]> {
    const meta = await sharp(buf).rotate().metadata();
    let { width = OUTPUT_LONG_EDGE, height = OUTPUT_LONG_EDGE } = meta;
    // EXIF の回転で縦横が入れ替わる場合
    if (meta.orientation && meta.orientation >= 5) [width, height] = [height, width];
    const scale = OUTPUT_LONG_EDGE / Math.max(width, height);
    const round = (v: number) => Math.max(256, Math.round((v * scale) / 16) * 16);
    return [round(width), round(height)];
}

// 背景画像の縮小結果はインスタンス内でキャッシュする
const backgroundCache = new Map<Buffer, Promise<Buffer>>();

export function createCloudflareProvider(): ImageEditProvider {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const token = process.env.CLOUDFLARE_API_TOKEN;
    const model = process.env.CLOUDFLARE_IMAGE_MODEL || DEFAULT_MODEL;

    return {
        name: `cloudflare:${model}`,
        async edit({ image, backgroundType, background }: EditImageInput) {
            if (!accountId || !token) {
                throw new ImageEditError("CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN が設定されていません");
            }

            const [width, height] = await outputSize(image);
            const form = new FormData();
            form.append("prompt", PROMPTS[backgroundType]);
            form.append("input_image_0", new Blob([new Uint8Array(await toSmallJpeg(image))], { type: "image/jpeg" }), "product.jpg");
            if (background) {
                let small = backgroundCache.get(background);
                if (!small) {
                    small = toSmallJpeg(background);
                    backgroundCache.set(background, small);
                }
                form.append("input_image_1", new Blob([new Uint8Array(await small)], { type: "image/jpeg" }), "background.jpg");
            }
            form.append("width", String(width));
            form.append("height", String(height));

            let res: Response;
            try {
                res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                    body: form,
                    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
                });
            } catch (e) {
                throw new ImageEditError(`Cloudflare への接続に失敗しました: ${e instanceof Error ? e.message : String(e)}`, true);
            }

            const json = (await res.json().catch(() => null)) as
                | { result?: { image?: string }; errors?: { code?: number; message?: string }[] }
                | null;
            const b64 = json?.result?.image;
            if (res.ok && b64) {
                return { dataUrl: `data:image/jpeg;base64,${b64}` };
            }

            const err = json?.errors?.[0];
            if (err?.code === 3030) {
                // 人物が写っている写真などで安全フィルタに弾かれた。再試行しても同じ結果になりやすい
                throw new ImageEditError("この写真はAIの安全フィルタにより加工できませんでした");
            }
            if (res.status === 429 || err?.code === 4006) {
                throw new ImageEditError("本日の無料の画像加工の上限に達しました");
            }
            throw new ImageEditError(
                `Cloudflare Workers AI error (HTTP ${res.status}${err?.code ? `, code ${err.code}` : ""}): ${err?.message ?? "no image"}`,
                res.status >= 500,
            );
        },
    };
}
