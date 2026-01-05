import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ItemService } from "@/services/item.service";
import { ItemFormState } from "@/types";

/**
 * Hook for handling item storage operations.
 */
export function useItemStorage() {
    const [isSaving, setIsSaving] = useState(false);
    const router = useRouter();

    const saveItem = useCallback(async (
        processedImage: string,
        formState: ItemFormState,
        onSuccess?: () => void
    ) => {
        if (!processedImage || !formState.title) {
            toast.error("必要な情報が不足しています");
            return;
        }

        setIsSaving(true);
        try {
            const user = await ItemService.getCurrentUser();

            if (!user) {
                toast.error("ログインが必要です");
                router.push("/login"); // Redirect handled by hook/component usually, but safe here
                return;
            }

            // 1. Prepare Image Blob
            let imageToUpload: Blob;
            if (processedImage.startsWith("data:") || processedImage.startsWith("blob:")) {
                const response = await fetch(processedImage);
                imageToUpload = await response.blob();
            } else {
                // If it's already a remote URL (unlikely in this flow but possible for edits), handle differently or error
                throw new Error("Invalid image format for upload");
            }

            // 2. Upload Image
            const publicUrl = await ItemService.uploadImage(imageToUpload, user.id);

            // 3. Save to DB
            await ItemService.saveItem(user.id, publicUrl, formState);

            toast.success("保存しました！");
            onSuccess?.();
            router.push("/history");
            router.refresh();

        } catch (error) {
            console.error(error);
            toast.error("保存に失敗しました");
        } finally {
            setIsSaving(false);
        }
    }, [router]);

    return {
        isSaving,
        saveItem,
    };
}
