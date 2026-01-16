/**
 * サイトフッターコンポーネント
 *
 * このコンポーネントの役割:
 * - アプリケーション共通のフッターUI
 * - バグ報告・お問い合わせリンク
 */

import Link from "next/link";

export function SiteFooter() {
    return (
        <footer className="w-full border-t bg-white py-4">
            <div className="container mx-auto flex flex-col items-center justify-center gap-2 px-4 text-center">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                    <a
                        href="https://forms.gle/gmjTgxPjNaCjmXJR7"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 underline"
                    >
                        バグ・ご意見を報告する
                    </a>
                </div>
                <p className="text-xs text-gray-400">
                    © {new Date().getFullYear()} Pigro
                </p>
            </div>
        </footer>
    );
}
