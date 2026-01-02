"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MercariPreview } from "@/components/mercari-preview";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { Item } from "@/types";

export default function ItemDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [item, setItem] = useState<Item | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Editable fields
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState(0);

    useEffect(() => {
        const fetchItem = async () => {
            const { data, error } = await supabase
                .from("items")
                .select("*")
                .eq("id", params.id)
                .single();

            if (error) {
                console.error("Error fetching item:", error);
                toast.error("商品が見つかりませんでした");
                router.push("/history");
                return;
            }

            setItem(data);
            setTitle(data.title || "");
            setDescription(data.description || "");
            setPrice(data.price || 0);
            setLoading(false);
        };

        if (params.id) {
            fetchItem();
        }
    }, [params.id, router]);

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

    if (loading) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
            </main>
        );
    }

    if (!item) {
        return null;
    }

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="container max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/history")}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-bold text-gray-900">商品を編集</h1>
                </div>

                {/* Preview with Edit Mode - Same as main page */}
                <MercariPreview
                    image={item.image_url}
                    title={title}
                    description={description}
                    price={price}
                    editable={true}
                    onTitleChange={setTitle}
                    onDescriptionChange={setDescription}
                    onPriceChange={setPrice}
                    onSave={handleSave}
                    isSaving={saving}
                />

                {/* Back Link */}
                <div className="flex justify-center pt-6">
                    <button
                        onClick={() => router.push("/history")}
                        className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                        キャンセル
                    </button>
                </div>
            </div>
        </main>
    );
}
