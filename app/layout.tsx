/**
 * ルートレイアウト
 *
 * このファイルの役割:
 * - アプリケーション全体のレイアウト定義
 * - 共通のヘッダー、フッター、プロバイダーの配置
 * - フォント、メタデータの設定
 *
 * Why layout.tsxを使うのか:
 * - App Routerの規約でルートレイアウトは必須
 * - 全ページで共有するUI要素を一元管理
 * - ネストしたレイアウトも可能（サブディレクトリにlayout.tsx）
 *
 * 設計パターン:
 * - Composition Pattern: children propsで子ページを受け取る
 * - Provider Pattern: Toasterなどのグローバルコンポーネントを配置
 *
 * Learning:
 * - Next.js Layouts: https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates
 * - Metadata API: https://nextjs.org/docs/app/building-your-application/optimizing/metadata
 * - next/font: https://nextjs.org/docs/app/building-your-application/optimizing/fonts
 */

import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

/**
 * 欧文フォント設定
 *
 * Why Interを使うのか:
 * - GoogleフォントでもっともWebに最適化されたサンセリフ体
 * - 可読性が高く、モダンな印象
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

/**
 * 日本語フォント設定
 *
 * Why Noto Sans JPを使うのか:
 * - Google提供で読み込み速度が最適化
 * - 日本語の可読性を担保
 * - CSS変数経由でfont-familyを統一
 */
const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
});

/**
 * メタデータ
 *
 * Why Metadata APIを使うのか:
 * - SEO最適化
 * - 静的に生成されるためパフォーマンスが良い
 * - 型安全
 */
export const metadata: Metadata = {
  title: "Pigro - AIフリマ出品アシスタント",
  description: "AI駆動のフリマ出品支援ツール - 売れる文章と写真を一瞬で",
};

/**
 * ルートレイアウトコンポーネント
 *
 * Why このレイアウト構造か:
 * 1. SiteHeader: 全ページ共通のナビゲーション
 * 2. children: 各ページのコンテンツ
 * 3. Toaster: トースト通知のグローバルコンテナ
 *
 * @param props - 子要素を含むprops
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${notoSansJP.variable} antialiased font-sans bg-gray-50 text-gray-900`}
        suppressHydrationWarning
      >
        <Providers>
          <SiteHeader />
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
