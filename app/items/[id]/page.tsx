"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MercariPreview } from "@/components/mercari-preview";
import { ImageGalleryPreview } from "@/components/features/image-gallery-preview";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Item, ItemImage } from "@/types";

/**
 * スケルトンローディングコンポーネント
 */
// ItemSkeleton removed - simplified UI logic

/**
 * 処理中テキスト表示
 */
function ProcessingStatus({ status }: { status: string }) {
    const statusMap: Record<string, { text: string; color: string }> = {
        pending: { text: "準備中...", color: "text-gray-500" },
        processing_text: { text: "商品情報を生成中...", color: "text-blue-600" },
        processing_images: { text: "画像を処理中...", color: "text-indigo-600" },
        completed: { text: "完了", color: "text-green-600" },
        failed: { text: "エラーが発生しました", color: "text-red-600" },
    };

    const info = statusMap[status] || statusMap.pending;

    return (
        <div className="flex items-center gap-2 mb-4">
            {status !== "completed" && status !== "failed" && (
                <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            )}
            <span className={cn("text-sm font-medium", info.color)}>
                {info.text}
            </span>
        </div>
    );
}

export default function ItemDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [item, setItem] = useState<Item | null>(null);
    const [itemImages, setItemImages] = useState<ItemImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Editable fields
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState(0);

    /**
     * アイテム取得関数
     */
    const fetchItem = useCallback(async () => {
        const { data: itemData, error: itemError } = await supabase
            .from("items")
            .select("*")
            .eq("id", params.id)
            .single();

        if (itemError) {
            console.error("Error fetching item:", itemError);
            toast.error("商品が見つかりませんでした");
            router.push("/history");
            return null;
        }

        return itemData;
    }, [params.id, router]);

    /**
     * 画像取得関数
     */
    const fetchImages = useCallback(async () => {
        const { data: imagesData } = await supabase
            .from("item_images")
            .select("*")
            .eq("item_id", params.id)
            .order("sort_order", { ascending: true });

        return imagesData || [];
    }, [params.id]);

    /**
     * 初回ロード & ポーリング
     */
    useEffect(() => {
        let pollInterval: NodeJS.Timeout | null = null;

        const loadData = async () => {
            const itemData = await fetchItem();
            if (!itemData) return;

            setItem(itemData);
            setTitle(itemData.title || "");
            setDescription(itemData.description || "");
            setPrice(itemData.price || 0);

            // アイテムデータが取れた時点で描画を開始する（First Paint高速化）
            // これにより、item.image_url（元画像）が即座に表示される
            setLoading(false);

            // 画像リストは非同期で取得して後から更新
            const images = await fetchImages();
            setItemImages(images);

            // 処理中の場合はポーリング開始
            if (itemData.processing_status && itemData.processing_status !== "completed" && itemData.processing_status !== "failed") {
                pollInterval = setInterval(async () => {
                    const updatedItem = await fetchItem();
                    if (updatedItem) {
                        setItem(updatedItem);
                        // テキストが生成されたら反映
                        if (updatedItem.title && !title) setTitle(updatedItem.title);
                        if (updatedItem.description && !description) setDescription(updatedItem.description);
                        if (updatedItem.price && !price) setPrice(updatedItem.price);

                        // 画像も更新
                        const updatedImages = await fetchImages();
                        setItemImages(updatedImages);

                        // 完了したらポーリング停止
                        if (updatedItem.processing_status === "completed" || updatedItem.processing_status === "failed") {
                            if (pollInterval) clearInterval(pollInterval);
                            if (updatedItem.processing_status === "completed") {
                                toast.success("生成が完了しました！");
                            }
                        }
                    }
                }, 2000); // 2秒ごとにポーリング
            }
        };

        if (params.id) {
            loadData();
        }

        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [params.id, fetchItem, fetchImages, title, description, price]);

    const handleSave = async () => {
        if (!item) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from("items")
                .update({
                    title,
                    description,
                    price,
                })
                .eq("id", item.id);

            if (error) throw error;

            toast.success("更新しました！");
            router.push("/history");
        } catch (error) {
            console.error(error);
            toast.error("更新に失敗しました");
        } finally {
            setSaving(false);
        }
    };

    // ローディング中
    if (loading) {
        return (
            <main className="min-h-screen bg-gray-50 h-screen overflow-hidden flex flex-col">
                <div className="container max-w-6xl mx-auto px-4 py-8 flex-1 flex flex-col min-h-0">
                    <div className="flex items-center gap-4 mb-6">
                        <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-xl font-bold text-gray-900">読み込み中...</h1>
                    </div>
                    {/* ローディング中でもプレビュー枠を表示する（中身は空またはスケルトン） */}
                    <MercariPreview
                        title=""
                        description=""
                        price={0}
                        isLoading={true}
                    />
                </div>
            </main>
        );
    }

    if (!item) {
        return null;
    }

    // 処理中かどうか
    const isProcessing = item.processing_status && item.processing_status !== "completed" && item.processing_status !== "failed";

    // 表示する画像配列を作成
    const displayImages = itemImages.length > 0
        ? itemImages.map((img) => ({
            id: img.id,
            url: img.image_url,
            isMain: img.is_main,
        }))
        : item.image_url ? [{ id: item.id, url: item.image_url, isMain: true }] : [];

    // アップロードされた元の画像URL（最初の画像をオリジナルとして扱う）
    const originalImage = displayImages[0]?.url;

    return (
        <main className="min-h-screen bg-gray-50 h-screen overflow-hidden flex flex-col">
            <div className="container max-w-6xl mx-auto px-4 py-8 flex-1 flex flex-col min-h-0">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(isProcessing ? "/" : "/history")}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-bold text-gray-900">
                        {isProcessing ? "生成中..." : "商品を編集"}
                    </h1>
                </div>

                {/* 処理ステータス表示 */}
                {isProcessing && <ProcessingStatus status={item.processing_status!} />}

                {/* Preview with Edit Mode */}
                <MercariPreview
                    image={displayImages[0]?.url || item.image_url}
                    originalImage={originalImage} // 元画像を渡す
                    multiImages={displayImages.length > 0 ? displayImages.map(img => img.url) : item.image_url ? [item.image_url] : undefined}
                    title={title}
                    description={description}
                    price={price}
                    editable={!isProcessing}
                    onTitleChange={setTitle}
                    onDescriptionChange={setDescription}
                    onPriceChange={setPrice}
                    onSave={handleSave}
                    isSaving={saving}
                    isProcessingImages={item.processing_status === "processing_images"}
                    isProcessingText={item.processing_status === "processing_text" || item.processing_status === "pending"}
                />

                {/* Back Link Removed per user request */}
            </div>
        </main>
    );
}
