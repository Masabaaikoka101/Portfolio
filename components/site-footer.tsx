/**
 * サイトフッターコンポーネント
 *
 * このコンポーネントの役割:
 * - アプリケーション共通のフッターUI
 * - 著作権情報の表示
 *
 * Why コンポーネントとして分離するのか:
 * - 全ページで共通使用するため
 * - レイアウトファイル(layout.tsx)から呼び出される
 */

export function SiteFooter() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full border-t bg-white py-6 mt-auto">
            <div className="container px-4 text-center">
                <p className="text-sm text-gray-500">
                    © {currentYear} Pigro. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
