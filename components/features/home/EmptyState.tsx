"use client";

import { ImageUploader } from "@/components/image-uploader";

interface EmptyStateProps {
    onImageSelect: (file: File) => void;
}

export function EmptyState({ onImageSelect }: EmptyStateProps) {
    return (
        <>
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">新規作成</h1>
                <p className="text-gray-600">商品の写真をアップロードしてください</p>
            </div>
            <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <ImageUploader onImageSelect={onImageSelect} className="aspect-[4/3]" />
            </div>
        </>
    );
}
