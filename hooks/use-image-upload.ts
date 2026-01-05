import { useState, useCallback } from "react";

/**
 * Hook for handling item image selection and preview.
 */
export function useImageUpload() {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    // processedImage holds the result of AI editing or the original if editing is skipped
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleImageSelect = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setOriginalImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        setSelectedFile(file);
        // Reset processed image when new image is selected
        setProcessedImage(null);
    }, []);

    const resetImage = useCallback(() => {
        setOriginalImage(null);
        setProcessedImage(null);
        setSelectedFile(null);
    }, []);

    return {
        originalImage,
        processedImage,
        setProcessedImage,
        selectedFile,
        handleImageSelect,
        resetImage,
    };
}
