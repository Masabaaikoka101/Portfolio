export type BackgroundType = "white" | "canvas" | "dark-wood" | "light-wood" | "marble";

export const BACKGROUND_TYPES: readonly BackgroundType[] = ["white", "canvas", "dark-wood", "light-wood", "marble"];

/** white 以外は背景の参照画像（public/backgrounds）を2枚目の入力として渡す */
export const BACKGROUND_FILES: Record<Exclude<BackgroundType, "white">, string> = {
    canvas: "canvas.jpeg",
    "dark-wood": "dark-wood.jpeg",
    "light-wood": "light-wood.jpeg",
    marble: "marble.jpeg",
};

export interface EditImageInput {
    image: Buffer;
    mimeType: string;
    backgroundType: BackgroundType;
    /** white 以外のときの背景参照画像 (JPEG) */
    background?: Buffer;
}

export interface EditImageOutput {
    /** data:<mime>;base64,... */
    dataUrl: string;
}

export interface ImageEditProvider {
    name: string;
    edit(input: EditImageInput): Promise<EditImageOutput>;
}

/** ユーザーに見せてよい理由付きの失敗 */
export class ImageEditError extends Error {
    constructor(message: string, readonly retryable = false) {
        super(message);
        this.name = "ImageEditError";
    }
}
