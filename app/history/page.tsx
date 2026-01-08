"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ItemCard } from "@/components/item-card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Trash2, CheckSquare, Square, X } from "lucide-react";
import { toast } from "sonner";
import type { Item } from "@/types";

export default function HistoryPage() {
    const router = useRouter();
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);
    const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

    // アンドゥ用
    const [deletedItems, setDeletedItems] = useState<Item[]>([]);
    const [showUndo, setShowUndo] = useState(false);
    const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetchItems();
    }, []);

    // キーボードショートカット
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 入力フィールドにフォーカス中は無視
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            // Ctrl+A: 全選択（編集モード時）
            if ((e.ctrlKey || e.metaKey) && e.key === "a") {
                if (isEditMode && items.length > 0) {
                    e.preventDefault();
                    setSelectedIds(new Set(items.map((item) => item.id)));
                }
            }

            // Escape: 選択解除 or 編集モード終了
            if (e.key === "Escape") {
                if (selectedIds.size > 0) {
                    setSelectedIds(new Set());
                } else if (isEditMode) {
                    setIsEditMode(false);
                }
            }

            // Delete/Backspace: 選択した商品を削除
            if ((e.key === "Delete" || e.key === "Backspace") && isEditMode && selectedIds.size > 0) {
                e.preventDefault();
                deleteSelected();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isEditMode, items, selectedIds]);

    const fetchItems = async () => {
        const { data, error } = await supabase
            .from("items")
            .select("id, image_url, title, description, price, status, created_at")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching items:", error);
        } else {
            setItems(data || []);
        }
        setLoading(false);

        // ページの先頭にスクロール
        window.scrollTo({ top: 0, behavior: "auto" });
    };

    // Shift+クリックで範囲選択
    const handleItemClick = (index: number, e: React.MouseEvent) => {
        if (!isEditMode) {
            router.push(`/items/${items[index].id}`);
            return;
        }

        const itemId = items[index].id;

        if (e.shiftKey && lastClickedIndex !== null) {
            // Shift+クリック: 範囲選択
            const start = Math.min(lastClickedIndex, index);
            const end = Math.max(lastClickedIndex, index);
            const newSelected = new Set(selectedIds);
            for (let i = start; i <= end; i++) {
                newSelected.add(items[i].id);
            }
            setSelectedIds(newSelected);
        } else if (e.ctrlKey || e.metaKey) {
            // Ctrl+クリック: 追加/削除選択
            const newSelected = new Set(selectedIds);
            if (newSelected.has(itemId)) {
                newSelected.delete(itemId);
            } else {
                newSelected.add(itemId);
            }
            setSelectedIds(newSelected);
            setLastClickedIndex(index);
        } else {
            // 通常クリック: トグル
            const newSelected = new Set(selectedIds);
            if (newSelected.has(itemId)) {
                newSelected.delete(itemId);
            } else {
                newSelected.add(itemId);
            }
            setSelectedIds(newSelected);
            setLastClickedIndex(index);
        }
    };

    // 全選択/全解除
    const toggleSelectAll = () => {
        if (selectedIds.size === items.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(items.map((item) => item.id)));
        }
    };

    // 編集モードの切り替え
    const toggleEditMode = () => {
        if (isEditMode) {
            setSelectedIds(new Set());
            setLastClickedIndex(null);
        }
        setIsEditMode(!isEditMode);
    };

    // 選択した商品を削除（アンドゥ対応）
    const deleteSelected = async () => {
        if (selectedIds.size === 0) return;

        const itemsToDelete = items.filter((item) => selectedIds.has(item.id));
        const remainingItems = items.filter((item) => !selectedIds.has(item.id));

        // 楽観的更新（UIを先に更新）
        setItems(remainingItems);
        setDeletedItems(itemsToDelete);
        setSelectedIds(new Set());
        setIsEditMode(false);
        setShowUndo(true);

        // 5秒後にアンドゥUIを非表示
        if (undoTimeoutRef.current) {
            clearTimeout(undoTimeoutRef.current);
        }
        undoTimeoutRef.current = setTimeout(() => {
            commitDelete(itemsToDelete);
        }, 5000);

        toast.success(`${itemsToDelete.length}件を削除しました`, {
            action: {
                label: "元に戻す",
                onClick: () => undoDelete(),
            },
            duration: 5000,
        });
    };

    // 実際にDBから削除
    const commitDelete = async (itemsToDelete: Item[]) => {
        setShowUndo(false);
        setIsDeleting(true);

        try {
            const { error } = await supabase
                .from("items")
                .delete()
                .in("id", itemsToDelete.map((item) => item.id));

            if (error) {
                console.error("Delete error:", error);
                // エラー時は復元
                setItems((prev) => [...itemsToDelete, ...prev].sort(
                    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                ));
                toast.error("削除に失敗しました");
            }
        } finally {
            setIsDeleting(false);
            setDeletedItems([]);
        }
    };

    // アンドゥ: 削除を取り消し
    const undoDelete = () => {
        if (undoTimeoutRef.current) {
            clearTimeout(undoTimeoutRef.current);
        }

        // 削除したアイテムを復元
        setItems((prev) => [...deletedItems, ...prev].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
        setDeletedItems([]);
        setShowUndo(false);
        toast.info("削除を取り消しました");
    };

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="container max-w-5xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">作成一覧</h1>
                        <p className="text-sm text-blue-600 mt-1">
                            作成済みの下書き ({items.length})
                        </p>
                    </div>
                    {items.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleEditMode}
                            className={isEditMode
                                ? "border-red-400 text-red-600 bg-red-50 hover:bg-red-100"
                                : "border-gray-300 text-gray-700 hover:bg-gray-100"
                            }
                        >
                            {isEditMode ? (
                                <>
                                    <X className="h-4 w-4 mr-1" />
                                    キャンセル
                                </>
                            ) : (
                                "選択・削除"
                            )}
                        </Button>
                    )}
                </div>

                {/* Edit Mode Actions */}
                {isEditMode && items.length > 0 && (
                    <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 mb-4 animate-in fade-in duration-200">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={toggleSelectAll}
                                className="text-gray-600"
                            >
                                {selectedIds.size === items.length ? (
                                    <>
                                        <CheckSquare className="h-4 w-4 mr-1 text-blue-600" />
                                        全解除
                                    </>
                                ) : (
                                    <>
                                        <Square className="h-4 w-4 mr-1" />
                                        全選択
                                    </>
                                )}
                            </Button>
                            <span className="text-sm text-gray-500">
                                {selectedIds.size}件選択中
                            </span>
                        </div>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={deleteSelected}
                            disabled={selectedIds.size === 0 || isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                                <Trash2 className="h-4 w-4 mr-1" />
                            )}
                            削除
                        </Button>
                    </div>
                )}


                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-gray-500 mb-4">まだ作成がありません</p>
                        <Link href="/">
                            <Button className="bg-gray-900 text-white hover:bg-gray-800">
                                はじめての作成をする
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {items.map((item, index) => (
                            <div key={item.id} className="relative">
                                {isEditMode && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleItemClick(index, e);
                                        }}
                                        className="absolute top-2 left-2 z-10 h-6 w-6 rounded-full bg-white shadow-md flex items-center justify-center border border-gray-200"
                                    >
                                        {selectedIds.has(item.id) ? (
                                            <CheckSquare className="h-4 w-4 text-blue-600" />
                                        ) : (
                                            <Square className="h-4 w-4 text-gray-400" />
                                        )}
                                    </button>
                                )}
                                <ItemCard
                                    imageUrl={item.image_url}
                                    title={item.title}
                                    price={item.price}
                                    status={item.status || "目立った傷や汚れなし"}
                                    createdAt={item.created_at}
                                    isEditMode={isEditMode}
                                    onClick={(e) => handleItemClick(index, e as React.MouseEvent)}
                                    className={
                                        isEditMode && selectedIds.has(item.id)
                                            ? "ring-2 ring-blue-500 scale-[0.98] transition-transform"
                                            : "transition-transform"
                                    }
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
