import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import {
    BACKGROUND_FILES,
    BACKGROUND_TYPES,
    ImageEditError,
    getImageEditProvider,
    type BackgroundType,
} from "@/lib/image-edit";

/**
 * 商品写真の背景だけを置き換える API。
 *
 * プロバイダは環境変数 IMAGE_PROVIDER で切り替える（lib/image-edit）。
 * 失敗時は { success: false, error } を返し、クライアント側は元の画像を表示する。
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const backgroundBuffers = new Map<string, Buffer>();
function loadBackground(type: Exclude<BackgroundType, "white">): Buffer {
    const file = BACKGROUND_FILES[type];
    let buf = backgroundBuffers.get(file);
    if (!buf) {
        buf = fs.readFileSync(path.join(process.cwd(), "public", "backgrounds", file));
        backgroundBuffers.set(file, buf);
    }
    return buf;
}

export async function POST(req: NextRequest) {
    const started = Date.now();
    let providerName = "unknown";
    try {
        const formData = await req.formData();
        const file = formData.get("image");
        const requested = formData.get("backgroundType");
        const backgroundType: BackgroundType = BACKGROUND_TYPES.includes(requested as BackgroundType)
            ? (requested as BackgroundType)
            : "white";

        if (!(file instanceof File)) {
            return NextResponse.json({ success: false, error: "No image provided" }, { status: 400 });
        }

        const provider = getImageEditProvider();
        providerName = provider.name;

        const input = {
            image: Buffer.from(await file.arrayBuffer()),
            mimeType: file.type || "image/jpeg",
            backgroundType,
            background: backgroundType === "white" ? undefined : loadBackground(backgroundType),
        };

        let result;
        try {
            result = await provider.edit(input);
        } catch (e) {
            // 一時的なエラー（5xx・通信失敗）だけ1回だけ再試行する
            if (e instanceof ImageEditError && e.retryable) {
                console.warn(`[edit-image] ${providerName} retrying after: ${e.message}`);
                result = await provider.edit(input);
            } else {
                throw e;
            }
        }

        console.log(`[edit-image] ok provider=${providerName} bg=${backgroundType} ${Date.now() - started}ms`);
        return NextResponse.json({ success: true, imageUrl: result.dataUrl });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[edit-image] failed provider=${providerName} ${Date.now() - started}ms: ${message}`);
        return NextResponse.json(
            { success: false, error: "Failed to process image", details: message },
            { status: 500 },
        );
    }
}
