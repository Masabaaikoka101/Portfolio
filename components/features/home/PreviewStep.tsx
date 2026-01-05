"use client";

import { MercariPreview } from "@/components/mercari-preview";

interface PreviewStepProps {
    processedImage: string;
    originalImage: string;
    title: string;
    description: string;
    price: number;
    isSaving: boolean;
    setTitle: (value: string) => void;
    setDescription: (value: string) => void;
    setPrice: (value: number) => void;
    onSave: () => void;
    onReset: () => void;
}

export function PreviewStep({
    processedImage,
    originalImage,
    title,
    description,
    price,
    isSaving,
    setTitle,
    setDescription,
    setPrice,
    onSave,
    onReset,
}: PreviewStepProps) {
    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div>
                <h2 className="text-lg font-semibold mb-4 text-gray-700">
                    出品プレビュー
                    <span className="text-sm font-normal text-blue-600 ml-2">
                        (編集可能)
                    </span>
                </h2>
                <MercariPreview
                    image={processedImage}
                    originalImage={originalImage}
                    title={title}
                    description={description}
                    price={price}
                    onSave={onSave}
                    isSaving={isSaving}
                    editable={true}
                    onTitleChange={setTitle}
                    onDescriptionChange={setDescription}
                    onPriceChange={setPrice}
                />
            </div>

            <div className="flex justify-center pt-4">
                <button
                    onClick={onReset}
                    className="text-sm text-gray-500 hover:text-red-500 underline"
                >
                    リセットしてやり直す
                </button>
            </div>
        </div>
    );
}
