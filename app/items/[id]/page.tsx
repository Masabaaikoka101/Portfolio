"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MercariPreview } from "@/components/mercari-preview";
import { Button } from "@/components/ui/button";
import {
    Loader2,
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Pencil,
    Check,
    X
} from "lucide-react";
import { toast } from "sonner";
import type { Item, ItemStatus } from "@/types";
import { useItemNavigation } from "@/hooks/use-item-navigation";
import { AiService } from "@/services/ai.service";
import { ItemService } from "@/services/item.service";
import { SYSTEM_TAG_PREFIX } from "@/lib/constants";
import { useNavigationGuard } from "@/contexts/navigation-guard-context";

// ... (existing code up to useState definitions)

export default function ItemDetailPage() {
    const params = useParams();
    const router = useRouter();
    const itemId = params.id as string;

    const [item, setItem] = useState<Item | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false); // New: Edit mode state

    // Navigation Hook
    const { prevId, nextId } = useItemNavigation(itemId);

    // Editable fields
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState(0);
    const [status, setStatus] = useState<ItemStatus | "">("");

    // Image selection state
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [localImages, setLocalImages] = useState<(string | null)[]>([]);
    const [processingStates, setProcessingStates] = useState<Record<number, boolean>>({});

    // アップロード中かどうか（processingStatesに1つでもtrueがあればアップロード中）
    const isUploading = Object.values(processingStates).some(Boolean);

    // Navigation Guard
    const { setNavigationGuard, confirmNavigation } = useNavigationGuard();

    // Sync guard state with edit mode
    useEffect(() => {
        setNavigationGuard(isEditing);
        return () => setNavigationGuard(false);
    }, [isEditing, setNavigationGuard]);

    // Dirty Check Logic: Confirm before leaving if editing
    const handleNavigation = useCallback((path: string | (() => void)) => {
        if (isEditing) {
            if (!confirmNavigation()) {
                return;
            }
        }
        if (typeof path === "string") {
            router.push(path);
        } else {
            path();
        }
    }, [isEditing, router, confirmNavigation]);

    // Intercept back button
    const handleBack = () => handleNavigation("/history");

    // Intercept item traversal
    const goToItem = (id: string) => handleNavigation(`/items/${id}`);


    // ... (useEffect for keyboard shortcuts - update using handleNavigation logic if possible or disable during edit to avoid accidents)
    // Keyboard navigation disabled during edit mode for safety
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isEditing) return; // Disable keyboard nav during edit
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key === "ArrowLeft" && e.shiftKey && prevId) goToItem(prevId);
            else if (e.key === "ArrowRight" && e.shiftKey && nextId) goToItem(nextId);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [prevId, nextId, isEditing, handleNavigation]);




    // Initial Data Fetch
    useEffect(() => {
        const fetchItem = async () => {
            setLoading(true);
            setError(null);
            setSelectedIndex(0);
            setIsEditing(false); // Reset edit mode on load

            const { data, error } = await supabase
                .from("items")
                .select("*")
                .eq("id", itemId)
                .single();

            if (error) {
                console.error("Error fetching item:", error);
                setError("商品が見つかりませんでした。削除されたか、アクセス権がありません。");
                setLoading(false);
                return;
            }

            setItem(data);
            setTitle(data.title || "");
            setDescription(data.description || "");
            setPrice(data.price || 0);
            setStatus(data.status || "");

            const initImages = [data.image_url, ...(data.other_images || [])].filter(Boolean);
            setLocalImages(initImages);
            setLoading(false);
        };

        if (itemId) fetchItem();
    }, [itemId]);


    const handleSave = async () => {
        if (!item) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from("items")
                .update({
                    title, description, price, status,
                    image_url: localImages[0] || item.image_url,
                    original_image_url: item.original_image_url, // Keep original image URL
                    original_other_images: item.original_other_images || [], // Keep other original images
                    // blob: URLは一時的なものなので保存対象から除外
                    other_images: localImages.slice(1).filter((img): img is string => !!img && !img.startsWith('blob:')),
                })
                .eq("id", item.id);

            if (error) throw error;

            toast.success("更新しました！");
            setIsEditing(false); // Exit edit mode on save
        } catch (error) {
            console.error(error);
            toast.error("更新に失敗しました");
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        if (!window.confirm("編集内容を破棄して元の状態に戻しますか？")) return;
        // Revert changes by re-fetching or using initial state logic if stored.
        // For simplicity, we can just reset state from `item` object.
        if (item) {
            setTitle(item.title || "");
            setDescription(item.description || "");
            setPrice(item.price || 0);
            setStatus(item.status || "");
            const initImages = [item.image_url, ...(item.other_images || [])].filter(Boolean);
            setLocalImages(initImages);
        }
        setIsEditing(false);
    };

    const handleDeleteImage = (index: number) => {
        if (localImages.length <= 1) {
            toast.error("画像は最低1枚必要です");
            return;
        }
        setLocalImages(prev => prev.filter((_, i) => i !== index));
        // Reset processing state for the deleted index is tricky because indices shift.
        // It's safer to just clear it or let it be since we match by index. 
        // A better approach would be to track by ID, but simple index filter is fine for this scope.
    };

    const handleReorder = (newIndices: number[]) => {
        // newIndices is an array of indices in the new order, e.g., [2, 0, 1]
        // But Reorder.Group usually expects you to reorder the *values* based on the drag result if passing values directly.
        // In MercariPreview, we are passing `orderedIndices` to onReorder.
        // However, MercariPreview's implementation of onReorder sends back the *new order of indices*.
        // So we need to reconstruct the localImages array based on this new order.

        // Wait, MercariPreview's internal implementation:
        // values={orderedIndices} onReorder={setOrderedIndices}
        // It updates its own internal order. Then calling onReorder?.(orderedIndices).
        // If MercariPreview passes the *updated list of indices* (e.g. [1, 0, 2]),
        // we should map those back to the images.

        // Actually, looking at MercariPreview logic:
        // `onDragEnd={() => onReorder?.(orderedIndices)}`
        // It passes the *current local state* of orderedIndices from MercariPreview.

        setLocalImages(prev => newIndices.map(i => prev[i]));
        setSelectedIndex(0); // Auto-select the top image
    };

    const handleAddImage = async (files: File[]) => {
        console.log("[Debug] handleAddImage called. Files:", files.length);

        if (!item || files.length === 0) {
            console.warn("[Debug] No item or no files. Item:", !!item, "Files:", files.length);
            return;
        }

        // Check for background tag (Safety check for array)
        const tags = Array.isArray(item.tags) ? item.tags : [];
        const bgTag = tags.find(t => t.startsWith(SYSTEM_TAG_PREFIX));
        const backgroundType = bgTag ? bgTag.replace(SYSTEM_TAG_PREFIX, "") : null;
        console.log("[Debug] Background Type:", backgroundType);

        const startIndex = localImages.length;
        const newUrls = files.map(file => URL.createObjectURL(file));

        // Optimistic update: show images immediately
        setLocalImages(prev => [...prev, ...newUrls]);

        // Set loading states
        setProcessingStates(prev => {
            const next = { ...prev };
            newUrls.forEach((_, i) => {
                next[startIndex + i] = true;
            });
            return next;
        });

        const uploadImage = async (file: File, blobUrl: string, initialIndex: number) => {
            try {
                console.log(`[Debug] uploadImage started for ${file.name}`);
                let fileToUpload: File | Blob = file;

                // 1. AI Background Processing (if setting exists)
                if (backgroundType) {
                    try {
                        console.log(`[Debug] Processing background: ${backgroundType} for ${file.name}`);
                        const result = await AiService.editImage(file, backgroundType);
                        if (result.success && result.imageUrl) {
                            console.log("[Debug] AI processing success", result.imageUrl);
                            // Convert Data URL to Blob
                            const res = await fetch(result.imageUrl);
                            fileToUpload = await res.blob();
                        } else {
                            console.warn("[Debug] Background processing failed, using original.", result.error);
                            toast.error(`背景処理に失敗しました: ${file.name} (オリジナルを使用します)`);
                        }
                    } catch (e) {
                        console.error("[Debug] AI Service Error:", e);
                        toast.error(`AI処理中にエラーが発生しました (オリジナルを使用します)`);
                    }
                }

                // 2. Upload to Supabase Storage
                const fileExt = file.name.split(".").pop() || "png";
                // Ensure unique filename
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const userId = (item as any).user_id || "guest";
                const filePath = `${userId}/${fileName}`;

                console.log(`[Debug] Uploading to Supabase: ${filePath}`);

                const { error: uploadError } = await supabase.storage
                    .from("item-images")
                    .upload(filePath, fileToUpload);

                if (uploadError) {
                    console.error("[Debug] Supabase upload error:", uploadError);
                    throw uploadError;
                }

                const { data: { publicUrl } } = supabase.storage
                    .from("item-images")
                    .getPublicUrl(filePath);

                console.log(`[Debug] Upload success. Public URL: ${publicUrl}`);

                // 3. Update state with real URL by matching the placeholder blob URL
                // This prevents index mismatch if user deleted images during upload
                setLocalImages(prev => prev.map(url => url === blobUrl ? publicUrl : url));

            } catch (error) {
                console.error("[Debug] Error uploading image:", error);
                toast.error(`画像のアップロードに失敗しました: ${file.name}`);
                // Optional: Remove the failed image from localImages?
                // For now, keep it (it will remain as blob URL or broken) to let user retry or delete.
            } finally {
                setProcessingStates(prev => {
                    const next = { ...prev };
                    delete next[initialIndex];
                    return next;
                });
            }
        };

        // Process all files in parallel
        await Promise.all(files.map((file, i) => uploadImage(file, newUrls[i], startIndex + i)));
    };

    // ... (Loading/Error states)

    const handleRegenerate = async () => {
        if (!item?.original_image_url || selectedIndex !== 0) {
            toast.error("メイン画像の再生成のみ可能です");
            return;
        }

        setProcessingStates(prev => ({ ...prev, [selectedIndex]: true }));

        try {
            const originalUrl = item.original_image_url;

            // 1. Fetch and process image
            const response = await fetch(originalUrl);
            if (!response.ok) throw new Error("Failed to fetch original image");
            const blob = await response.blob();
            const file = new File([blob], "original.png", { type: blob.type });

            const bgTag = item?.tags?.find(t => t.startsWith(SYSTEM_TAG_PREFIX));
            const backgroundType = bgTag ? bgTag.replace(SYSTEM_TAG_PREFIX, "") : "white";

            const result = await AiService.editImage(file, backgroundType);

            if (result.success && result.imageUrl) {
                // 2. Upload processed image to Storage
                const res = await fetch(result.imageUrl);
                const processedBlob = await res.blob();

                const fileName = `${Date.now()}_regenerated.png`;
                const userId = item.user_id || "guest";
                const filePath = `${userId}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from("item-images")
                    .upload(filePath, processedBlob);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from("item-images")
                    .getPublicUrl(filePath);

                // 3. Update local state (Overwrite)
                setLocalImages(prev => {
                    const next = [...prev];
                    next[selectedIndex] = publicUrl;
                    return next;
                });
                toast.success("再生成しました。保存して確定してください。");
            } else {
                throw new Error(result.error || "Generation failed");
            }
        } catch (error) {
            console.error("Regeneration error:", error);
            toast.error("再生成に失敗しました");
        } finally {
            setProcessingStates(prev => {
                const next = { ...prev };
                delete next[selectedIndex];
                return next;
            });
        }
    };

    if (loading) return <main className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="h-8 w-8 text-gray-400 animate-spin" /></main>;
    if (error) return <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4"><div className="text-center max-w-md"><h2 className="text-2xl font-bold text-gray-900 mb-4">エラーが発生しました</h2><p className="text-gray-600 mb-8">{error}</p><Button onClick={() => router.push("/history")}>一覧に戻る</Button></div></main>;
    if (!item) return null;

    return (
        <main className="min-h-screen bg-gray-50 pb-20">
            <div className="container max-w-7xl mx-auto px-4 py-8 relative"> {/* Updated max-w to match PreviewStep */}

                {/* Header */}
                <div className="flex items-center justify-between mb-6 sticky top-0 z-40 bg-gray-50/95 backdrop-blur py-2">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={handleBack}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-xl font-bold text-gray-900">
                            {isEditing ? "商品を編集" : "作成一覧"}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        {!isEditing ? (
                            <>
                                {/* PC Nav (Read Mode) */}
                                <div className="hidden md:flex gap-2 mr-4">
                                    <Button variant="outline" size="sm" disabled={!prevId} onClick={() => prevId && goToItem(prevId)}>
                                        <ChevronLeft className="h-4 w-4 mr-1" /> 前の商品
                                    </Button>
                                    <Button variant="outline" size="sm" disabled={!nextId} onClick={() => nextId && goToItem(nextId)}>
                                        次の商品 <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </div>
                                <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    <Pencil className="h-4 w-4 mr-2" />
                                    編集する
                                </Button>
                            </>
                        ) : (
                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={handleCancelEdit}>
                                    キャンセル
                                </Button>
                                <Button onClick={handleSave} disabled={saving || isUploading} className="bg-red-600 hover:bg-red-700 text-white min-w-[100px]" title={isUploading ? '画像アップロード中...' : undefined}>
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "更新"}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex justify-center">
                    <div className="w-full">
                        <MercariPreview
                            image={item.image_url}
                            originalImage={item.original_image_url} // Persist original image
                            images={localImages}
                            originalImages={[
                                item.original_image_url,
                                ...(item.original_other_images || [])
                            ]}
                            selectedIndex={selectedIndex}
                            onImageSelect={setSelectedIndex}
                            loadingStates={localImages.map((_, i) => !!processingStates[i])}
                            onAddImage={isEditing ? handleAddImage : undefined} // Only allow add in edit mode
                            onDeleteImage={isEditing ? handleDeleteImage : undefined}
                            onReorder={isEditing ? handleReorder : undefined}
                            title={title}
                            description={description}
                            price={price}
                            status={status || undefined}
                            editable={isEditing} // Toggle edit mode
                            onTitleChange={setTitle}
                            onDescriptionChange={setDescription}
                            onPriceChange={setPrice}
                            onStatusChange={setStatus}
                            onSave={isEditing ? handleSave : undefined} // Show save button inside preview only in edit mode (optional, header has it too)
                            isSaving={saving}
                            onRegenerate={isEditing ? handleRegenerate : undefined}
                            isAnalyzing={item.is_processing} // Pass processing state to show skeleton
                        />
                    </div>
                </div>

                {/* Mobile Bottom Navigation (Read Mode Only) */}
                {!isEditing && (
                    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex items-center justify-between z-50">
                        <Button variant="ghost" disabled={!prevId} onClick={() => prevId && goToItem(prevId)} className="flex-1">
                            <ChevronLeft className="h-5 w-5 mr-1" /> 前へ
                        </Button>
                        <div className="w-px h-6 bg-gray-200 mx-2"></div>
                        <Button variant="ghost" disabled={!nextId} onClick={() => nextId && goToItem(nextId)} className="flex-1">
                            次へ <ChevronRight className="h-5 w-5 ml-1" />
                        </Button>
                    </div>
                )}

            </div>
        </main>
    );
}
