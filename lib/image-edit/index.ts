import { createCloudflareProvider } from "./cloudflare";
import { createGeminiProvider } from "./gemini";
import type { ImageEditProvider } from "./types";

export * from "./types";

/**
 * 環境変数 IMAGE_PROVIDER で画像編集プロバイダを切り替える。
 * - "cloudflare"（既定）: Workers AI の FLUX.2 [klein] 4B。無料枠で動く
 * - "gemini": Gemini の画像モデル。有料キーが必要
 */
export function getImageEditProvider(): ImageEditProvider {
    const name = (process.env.IMAGE_PROVIDER || "cloudflare").trim().toLowerCase();
    switch (name) {
        case "gemini":
            return createGeminiProvider();
        case "cloudflare":
            return createCloudflareProvider();
        default:
            console.warn(`[edit-image] Unknown IMAGE_PROVIDER "${name}", falling back to cloudflare`);
            return createCloudflareProvider();
    }
}
