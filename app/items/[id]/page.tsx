"use client";

import React, { useEffect, useState, useCallback } from "react";
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
    Download
} from "lucide-react";
import { toast } from "sonner";
import type { Item, ItemStatus } from "@/types";
import { useItemNavigation } from "@/hooks/use-item-navigation";
import { AiService } from "@/services/ai.service";
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
    const [isEditing, setIsEditing] = useState(false); // デフォルトはプレビュー表示

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
    const [localOriginalImages, setLocalOriginalImages] = useState<(string | undefined)[]>([]);
    const [processingStates, setProcessingStates] = useState<Record<number, boolean>>({});

    // 初期値保持（Dirty Check用）
    const [initialTitle, setInitialTitle] = useState("");
    const [initialDescription, setInitialDescription] = useState("");
    const [initialPrice, setInitialPrice] = useState(0);
    const [initialStatus, setInitialStatus] = useState<ItemStatus | "">("");
    const [initialImages, setInitialImages] = useState<string[]>([]);

    // アップロード中かどうか（processingStatesに1つでもtrueがあればアップロード中）
    // NOTE: 将来的にUI表示に使用予定のため定義を残す
    const _isUploading = Object.values(processingStates).some(Boolean);
    void _isUploading; // lint警告を抑制

    // Navigation Guard
    const { setNavigationGuard, confirmNavigation } = useNavigationGuard();

    // Dirty Check: 初期値と現在値を比較
    const isDirty = React.useMemo(() => {
        if (title !== initialTitle) return true;
        if (description !== initialDescription) return true;
        if (price !== initialPrice) return true;
        if (status !== initialStatus) return true;
        // 画像比較（URLのリストが変わったか）
        const currentImgStr = localImages.filter(Boolean).join(',');
        const initialImgStr = initialImages.join(',');
        if (currentImgStr !== initialImgStr) return true;
        return false;
    }, [title, description, price, status, localImages, initialTitle, initialDescription, initialPrice, initialStatus, initialImages]);

    // Sync guard state with dirty state (not just isEditing)
    useEffect(() => {
        setNavigationGuard(isDirty);
        return () => setNavigationGuard(false);
    }, [isDirty, setNavigationGuard]);

    // Dirty Check Logic: Confirm before leaving if there are unsaved changes
    const handleNavigation = useCallback((path: string | (() => void)) => {
        if (isDirty) {
            if (!confirmNavigation()) {
                return;
            }
        }
        if (typeof path === "string") {
            router.push(path);
        } else {
            path();
        }
    }, [isDirty, router, confirmNavigation]);

    // Intercept back button
    const handleBack = () => handleNavigation("/");

    // Intercept item traversal
    const goToItem = (id: string) => handleNavigation(`/items/${id}`);

    // Download Image Handler
    const handleDownload = async () => {
        const urlToDownload = localImages[selectedIndex];
        if (!urlToDownload) {
            toast.error("ダウンロードする画像がありません");
            return;
        }

        try {
            toast.loading("ダウンロード準備中...", { id: "downloading" });
            const response = await fetch(urlToDownload);
            if (!response.ok) throw new Error("Network response was not ok");
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.style.display = "none";
            a.href = blobUrl;
            // Use item title or ID for filename, sanitize title if used
            const safeTitle = (item?.title || "item").replace(/[^a-z0-9]/gi, '_').toLowerCase();
            a.download = `${safeTitle}_image_${selectedIndex + 1}.png`;

            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);

            toast.success("ダウンロードが完了しました", { id: "downloading" });
        } catch (error) {
            console.error("Download failed:", error);
            toast.error("ダウンロードに失敗しました", { id: "downloading" });
        }
    };


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
    }, [prevId, nextId, isEditing, handleNavigation, goToItem]);




    // Initial Data Fetch
    useEffect(() => {
        const fetchItem = async () => {
            setLoading(true);
            setError(null);
            setSelectedIndex(0);
            // isEditing はリセットしない（常に編集モード）

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
            const loadedTitle = data.title || "";
            const loadedDesc = data.description || "";
            const loadedPrice = data.price || 0;
            const loadedStatus = data.status || "";

            setTitle(loadedTitle);
            setDescription(loadedDesc);
            setPrice(loadedPrice);
            setStatus(loadedStatus);

            // 初期値を保存（Dirty Check用）
            setInitialTitle(loadedTitle);
            setInitialDescription(loadedDesc);
            setInitialPrice(loadedPrice);
            setInitialStatus(loadedStatus);

            const processedImages = [data.image_url, ...(data.other_images || [])].filter((img): img is string => !!img);
            setLocalImages(processedImages);
            setInitialImages(processedImages); // 初期値も保存

            // オリジナル画像の配列を構築
            const origMain = data.original_image_url;
            const origOthers = data.original_other_images || [];
            const origArray: (string | undefined)[] = [];
            for (let i = 0; i < processedImages.length; i++) {
                if (i === 0) {
                    origArray.push(origMain);
                } else {
                    // original_other_imagesが不足している場合は処理済み画像をフォールバック
                    origArray.push(origOthers[i - 1] ?? processedImages[i]);
                }
            }
            setLocalOriginalImages(origArray);
            setLoading(false);
        };

        if (itemId) fetchItem();
    }, [itemId]);


    const handleSave = async () => {
        if (!item) return;
        setSaving(true);
        try {
            const validLocalImages = localImages.filter((img): img is string => !!img && !img.startsWith('blob:'));
            const validOrigImages = localOriginalImages.filter((img): img is string => !!img && !img.startsWith('blob:'));

            const { error } = await supabase
                .from("items")
                .update({
                    title, description, price, status,
                    image_url: validLocalImages[0] || item.image_url,
                    original_image_url: validOrigImages[0] || item.original_image_url,
                    original_other_images: validOrigImages.slice(1),
                    other_images: validLocalImages.slice(1),
                })
                .eq("id", item.id);

            if (error) throw error;

            toast.success("更新しました！");

            setInitialTitle(title);
            setInitialDescription(description);
            setInitialPrice(price);
            setInitialStatus(status);
            setInitialImages(validLocalImages);

            setIsEditing(false);
        } catch (error) {
            console.error(error);
            toast.error("更新に失敗しました");
        } finally {
            setSaving(false);
        }
    };



    const handleDeleteImage = (index: number) => {
        if (localImages.length <= 1) {
            toast.error("画像は最低1枚必要です");
            return;
        }
        setLocalImages(prev => prev.filter((_, i) => i !== index));
        setLocalOriginalImages(prev => prev.filter((_, i) => i !== index));
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
        // オリジナル画像も同じ順序で並び替え
        setLocalOriginalImages(prev => newIndices.map(i => prev[i]));
        setSelectedIndex(0); // Auto-select the top image
    };

    const handleAddImage = async (files: File[]) => {
        console.log("[Debug] handleAddImage called. Files:", files.length);

        if (!item || files.length === 0) {
            console.warn("[Debug] No item or no files. Item:", !!item, "Files:", files.length);
            return;
        }

        const tags = Array.isArray(item.tags) ? item.tags : [];
        const bgTag = tags.find(t => t.startsWith(SYSTEM_TAG_PREFIX));
        const backgroundType = bgTag ? bgTag.replace(SYSTEM_TAG_PREFIX, "") : null;
        console.log("[Debug] Background Type:", backgroundType);

        const startIndex = localImages.length;
        const newUrls = files.map(file => URL.createObjectURL(file));

        setLocalImages(prev => [...prev, ...newUrls]);
        setLocalOriginalImages(prev => [...prev, ...newUrls]);

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

                // 1. オリジナル画像を先にStorageへアップロード
                const origFileExt = file.name.split(".").pop() || "png";
                const origFileName = `orig_${Date.now()}_${Math.random().toString(36).substring(7)}.${origFileExt}`;
                const userId = item.user_id || "guest";
                const origFilePath = `${userId}/${origFileName}`;

                const { error: origUploadError } = await supabase.storage
                    .from("item-images")
                    .upload(origFilePath, file);

                if (origUploadError) throw origUploadError;

                const { data: { publicUrl: originalPublicUrl } } = supabase.storage
                    .from("item-images")
                    .getPublicUrl(origFilePath);

                // 2. AI Background Processing
                let fileToUpload: File | Blob = file;
                if (backgroundType) {
                    try {
                        const result = await AiService.editImage(file, backgroundType);
                        if (result.success && result.imageUrl) {
                            const res = await fetch(result.imageUrl);
                            fileToUpload = await res.blob();
                        } else {
                            toast.error(`背景処理に失敗しました: ${file.name} (オリジナルを使用します)`);
                        }
                    } catch (e) {
                        toast.error(`AI処理中にエラーが発生しました (オリジナルを使用します)`);
                    }
                }

                // 3. Upload processed image to Storage
                const fileExt = file.name.split(".").pop() || "png";
                const fileName = `proc_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${userId}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from("item-images")
                    .upload(filePath, fileToUpload);

                if (uploadError) throw uploadError;

                const { data: { publicUrl: processedPublicUrl } } = supabase.storage
                    .from("item-images")
                    .getPublicUrl(filePath);

                // 4. Update states
                setLocalImages(prev => prev.map(url => url === blobUrl ? processedPublicUrl : url));
                setLocalOriginalImages(prev => prev.map(url => url === blobUrl ? originalPublicUrl : url));

            } catch (error) {
                console.error("[Debug] Error uploading image:", error);
                toast.error(`画像のアップロードに失敗しました: ${file.name}`);
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

    if (loading) return <main className="min-h-screen bg-muted/30 flex items-center justify-center"><Loader2 className="h-8 w-8 text-muted-foreground animate-spin" /></main>;
    if (error) return <main className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4"><div className="text-center max-w-md"><h2 className="text-2xl font-bold text-foreground mb-4">エラーが発生しました</h2><p className="text-muted-foreground mb-8">{error}</p><Button onClick={() => router.push("/")}>一覧に戻る</Button></div></main>;
    if (!item) return null;

    return (
        <main className="min-h-screen bg-muted/30 pb-20">
            <div className="container max-w-7xl mx-auto px-4 py-8 relative"> {/* Updated max-w to match PreviewStep */}

                {/* Header */}
                <div className="flex items-center justify-between mb-6 sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 py-3 px-1 -mx-1 rounded-b-lg">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={handleBack} className="hover:bg-accent hover:text-accent-foreground">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-xl font-bold text-foreground">
                            {isEditing ? "商品を編集" : "商品詳細"}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        {!isEditing && (
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
                                <Button variant="outline" onClick={handleDownload} className="shadow-sm hover:bg-accent hidden md:flex">
                                    <Download className="h-4 w-4 md:mr-2" />
                                    <span className="hidden md:inline">ダウンロード</span>
                                </Button>
                                <Button onClick={() => setIsEditing(true)} className="shadow-md transition-transform active:scale-95">
                                    <Pencil className="h-4 w-4 md:mr-2" />
                                    <span className="hidden md:inline">編集する</span>
                                </Button>
                            </>
                        )}
                        {/* 編集モード中は「更新」ボタンで保存＆終了（MercariPreview内に配置） */}
                    </div>
                </div>

                {/* Content */}
                <div className="flex justify-center">
                    <div className="w-full">
                        <MercariPreview
                            image={item.image_url}
                            originalImage={item.original_image_url} // Persist original image
                            images={localImages}
                            originalImages={localOriginalImages}
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
                            onSave={isEditing ? handleSave : undefined}
                            saveLabel="更新する"
                            onPriceChange={setPrice}
                            onStatusChange={setStatus}

                            isSaving={saving}
                            onRegenerate={isEditing ? handleRegenerate : undefined}
                            isAnalyzing={item.is_processing} // Pass processing state to show skeleton
                        />
                    </div>
                </div>

                {/* Mobile Bottom Navigation (Read Mode Only) */}
                {!isEditing && (
                    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 p-4 flex items-center justify-between z-50">
                        <Button variant="ghost" disabled={!prevId} onClick={() => prevId && goToItem(prevId)} className="flex-1">
                            <ChevronLeft className="h-5 w-5 mr-1" /> 前へ
                        </Button>
                        <div className="w-px h-6 bg-border mx-1"></div>
                        <Button variant="ghost" onClick={handleDownload} className="flex-1 text-blue-600 hover:text-blue-700">
                            <Download className="h-5 w-5" />
                        </Button>
                        <div className="w-px h-6 bg-border mx-1"></div>
                        <Button variant="ghost" disabled={!nextId} onClick={() => nextId && goToItem(nextId)} className="flex-1">
                            次へ <ChevronRight className="h-5 w-5 ml-1" />
                        </Button>
                    </div>
                )}

            </div>
        </main>
    );
}
