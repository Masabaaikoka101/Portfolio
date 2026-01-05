"use client";

import { useState, useCallback } from "react";
import { AnalyzeResponse, ItemFormState, ItemStatus } from "@/types";
import { useImageUpload } from "./use-image-upload";
import { useAiAnalysis } from "./use-ai-analysis";
import { useItemStorage } from "./use-item-storage";

interface UseItemFormOptions {
    onSuccess?: () => void;
}

export function useItemForm(options?: UseItemFormOptions) {
    // 1. Image Handling
    const {
        originalImage,
        processedImage,
        setProcessedImage,
        selectedFile,
        handleImageSelect: onImageSelect,
        resetImage,
    } = useImageUpload();

    // 2. Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState(0);
    const [status, setStatus] = useState<ItemStatus | "">("");
    const [showStatusStep, setShowStatusStep] = useState(false);

    // Wrapper for image selection to trigger status step
    const handleImageSelect = useCallback((file: File) => {
        onImageSelect(file);
        setShowStatusStep(true);
    }, [onImageSelect]);

    // 3. AI Analysis
    const onAnalysisSuccess = useCallback((result: AnalyzeResponse) => {
        setTitle(result.title || "");
        setDescription(result.description || "");
        setPrice(result.price || 0);
    }, []);

    const onImageEditSuccess = useCallback((imageUrl: string) => {
        setProcessedImage(imageUrl);
    }, [setProcessedImage]);

    const onImageEditSkip = useCallback(() => {
        if (selectedFile) {
            setProcessedImage(URL.createObjectURL(selectedFile));
        }
    }, [selectedFile, setProcessedImage]);

    const { isAnalyzing, isEditingImage, startAnalysis: performAnalysis } = useAiAnalysis({
        selectedFile,
        status,
        onAnalysisSuccess,
        onImageEditSuccess,
        onImageEditSkip,
    });

    const startAnalysis = useCallback(async () => {
        setShowStatusStep(false);
        await performAnalysis();
    }, [performAnalysis]);

    // 4. Storage (Save)
    const { isSaving, saveItem: performSave } = useItemStorage();

    const save = useCallback(async () => {
        if (!processedImage) return;

        const formState: ItemFormState = {
            title,
            description,
            price,
            status,
        };

        await performSave(processedImage, formState, options?.onSuccess);
    }, [processedImage, title, description, price, status, performSave, options?.onSuccess]);

    // 5. Reset
    const reset = useCallback(() => {
        resetImage();
        setShowStatusStep(false);
        setStatus("" as ItemStatus | "");
        setTitle("");
        setDescription("");
        setPrice(0);
    }, [resetImage]);

    return {
        // Image
        originalImage,
        processedImage,
        selectedFile,

        // Status
        isAnalyzing,
        isEditingImage,
        isSaving,
        showStatusStep,

        // Form Fields
        title,
        setTitle,
        description,
        setDescription,
        price,
        setPrice,
        status,
        setStatus,

        // Actions
        handleImageSelect,
        startAnalysis,
        save,
        reset,
    };
}
