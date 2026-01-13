import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useItemNavigation(currentItemId: string | null) {
    const [prevId, setPrevId] = useState<string | null>(null);
    const [nextId, setNextId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentItemId) return;

        const fetchNavigation = async () => {
            setLoading(true);
            try {
                // 現在のアイテムリスト全体を取得（並び順はHistoryPageと同じにする）
                // 実際には全件取得せずに前後だけ取るのが効率的だが、
                // sort_orderが絡むため、まずは全IDを取得してインデックス計算する方が確実
                const { data, error } = await supabase
                    .from("items")
                    .select("id")
                    .order("sort_order", { ascending: true, nullsFirst: false })
                    .order("created_at", { ascending: false });

                if (error) throw error;

                if (data) {
                    const currentIndex = data.findIndex(item => item.id === currentItemId);
                    if (currentIndex !== -1) {
                        // 前のアイテム（リスト上の上）
                        if (currentIndex > 0) {
                            setPrevId(data[currentIndex - 1].id);
                        } else {
                            setPrevId(null);
                        }

                        // 次のアイテム（リスト上の下）
                        if (currentIndex < data.length - 1) {
                            setNextId(data[currentIndex + 1].id);
                        } else {
                            setNextId(null);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching navigation:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNavigation();
    }, [currentItemId]);

    return { prevId, nextId, loading };
}
