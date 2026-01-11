import { redirect } from "next/navigation";

/**
 * /history は / にリダイレクト
 * 後方互換性のために残している
 */
export default function HistoryPage() {
    redirect("/");
}
