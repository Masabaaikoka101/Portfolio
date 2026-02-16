/**
 * ネットワークステータス監視コンポーネント
 *
 * このコンポーネントの役割:
 * - ブラウザのオンライン/オフライン状態を監視
 * - オフライン時にバナーとトースト通知を表示
 * - オンライン復帰時に自動で通知を表示
 *
 * Why クライアントコンポーネントなのか:
 * - navigator.onLine や window イベントを使用するため
 *
 * Learning:
 * - Navigator.onLine: https://developer.mozilla.org/ja/docs/Web/API/Navigator/onLine
 */

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { WifiOff } from "lucide-react";

/**
 * オフライン検知バナー + トースト通知
 *
 * Why バナーとトーストを併用するのか:
 * - バナー: 常時表示でユーザーに状態を認識させる
 * - トースト: 状態変化の瞬間を通知する
 */
export function NetworkStatus() {
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        // 初期状態を設定
        setIsOffline(!navigator.onLine);

        const handleOffline = () => {
            setIsOffline(true);
            toast.error("インターネット接続が切断されました", {
                description: "一部の機能が利用できません。接続を確認してください。",
                duration: Infinity,
                id: "network-offline",
            });
        };

        const handleOnline = () => {
            setIsOffline(false);
            toast.dismiss("network-offline");
            toast.success("インターネット接続が復帰しました", {
                duration: 3000,
            });
        };

        window.addEventListener("offline", handleOffline);
        window.addEventListener("online", handleOnline);

        return () => {
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("online", handleOnline);
        };
    }, []);

    if (!isOffline) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 shadow-lg">
            <WifiOff className="h-4 w-4 flex-shrink-0" />
            <span>オフラインです — インターネット接続を確認してください</span>
        </div>
    );
}
