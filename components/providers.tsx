/**
 * プロバイダーコンポーネント
 *
 * このファイルの役割:
 * - クライアントサイドのコンテキストプロバイダーをまとめる
 * - サーバーコンポーネント（layout.tsx）からクライアントプロバイダーを分離
 *
 * Why 別ファイルにするのか:
 * - layout.tsxはサーバーコンポーネント（Metadataのため）
 * - Contextはクライアントコンポーネントでのみ使用可能
 * - "use client"を使うとそのファイル全体がクライアントになる
 */

"use client";

import { ReactNode } from "react";
import { FileSelectProvider } from "@/contexts/file-select-context";

interface ProvidersProps {
    children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    return (
        <FileSelectProvider>
            {children}
        </FileSelectProvider>
    );
}
