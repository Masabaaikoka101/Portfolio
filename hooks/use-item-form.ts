/**
 * 商品フォーム管理カスタムフック
 * 商品情報の状態管理と保存処理を一元化
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { DEFAULTS } from "@/lib/constants";
import type { AnalyzeResponse, EditImageResponse } from "@/types";

interface UseItemFormOptions {
    onSuccess?: () => void;
}

export function useItemForm(options?: UseItemFormOptions) {
    const router = useRouter();

    // 画像関連
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // 状態フラグ
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isEditingImage, setIsEditingImage] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showStatusStep, setShowStatusStep] = useState(false);

    // フォームフィールド
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState(0);
    const [status, setStatus] = useState("");

    /**
     * 画像選択時の処理
     */
    const handleImageSelect = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setOriginalImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        setSelectedFile(file);
        setShowStatusStep(true);
    };

    /**
     * AI分析の開始
     */
    const startAnalysis = async () => {
        if (!selectedFile) return;

        setShowStatusStep(false);
        setIsAnalyzing(true);
        setIsEditingImage(true);
        setProcessedImage(null);

        const formData = new FormData();
        formData.append("image", selectedFile);
        formData.append("status", status);

        const imageFormData = new FormData();
        imageFormData.append("image", selectedFile);

        const [analyzeResult, editResult] = await Promise.allSettled([
            fetch("/api/analyze", {
                method: "POST",
                body: formData,
            }).then(async (res) => {
                if (!res.ok) throw new Error("Analysis failed");
                return res.json() as Promise<AnalyzeResponse>;
            }),
            fetch("/api/edit-image", {
                method: "POST",
                body: imageFormData,
            }).then(async (res) => {
                if (!res.ok) throw new Error("Image editing failed");
                return res.json() as Promise<EditImageResponse>;
            }),
        ]);

        if (analyzeResult.status === "fulfilled") {
            setTitle(analyzeResult.value.title || "");
            setDescription(analyzeResult.value.description || "");
            setPrice(analyzeResult.value.price || 0);
        } else {
            toast.error("テキスト生成に失敗しました");
        }
        setIsAnalyzing(false);

        if (editResult.status === "fulfilled" && editResult.value.success) {
            setProcessedImage(editResult.value.imageUrl!);
        } else {
            setProcessedImage(URL.createObjectURL(selectedFile));
            toast.info("AI画像編集はスキップされました");
        }
        setIsEditingImage(false);
    };

    /**
     * 保存処理
     */
    const save = async () => {
        if (!processedImage || !title) return;

        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                toast.error("ログインが必要です");
                return;
            }

            // 画像のアップロード
            let imageToUpload: Blob;
            if (processedImage.startsWith("data:") || processedImage.startsWith("blob:")) {
                const response = await fetch(processedImage);
                imageToUpload = await response.blob();
            } else {
                throw new Error("Invalid image format");
            }

            const fileName = `${user.id}/${Date.now()}.png`;

            const { error: uploadError } = await supabase.storage
                .from("item-images")
                .upload(fileName, imageToUpload, { contentType: "image/png" });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from("item-images")
                .getPublicUrl(fileName);

            const { error: dbError } = await supabase.from("items").insert({
                user_id: user.id,
                image_url: publicUrl,
                title,
                description,
                price,
                status,
                category: DEFAULTS.category,
                tags: [],
            });

            if (dbError) throw dbError;

            toast.success("保存しました！");
            options?.onSuccess?.();
            router.push("/history");
        } catch (error) {
            console.error(error);
            toast.error("保存に失敗しました");
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * リセット処理
     */
    const reset = () => {
        setOriginalImage(null);
        setProcessedImage(null);
        setSelectedFile(null);
        setShowStatusStep(false);
        setStatus("");
        setTitle("");
        setDescription("");
        setPrice(0);
    };

    return {
        // 画像
        originalImage,
        processedImage,
        selectedFile,

        // 状態フラグ
        isAnalyzing,
        isEditingImage,
        isSaving,
        showStatusStep,

        // フォームフィールド
        title,
        setTitle,
        description,
        setDescription,
        price,
        setPrice,
        status,
        setStatus,

        // アクション
        handleImageSelect,
        startAnalysis,
        save,
        reset,
    };
}
