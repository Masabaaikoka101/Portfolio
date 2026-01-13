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
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import { BatchJobProvider } from "@/contexts/BatchJobContext";
import { FileSelectProvider } from "@/contexts/file-select-context";
import { NavigationGuardProvider } from "@/contexts/navigation-guard-context";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <BatchJobProvider>
                <FileSelectProvider>
                    <NavigationGuardProvider>
                        <TooltipProvider>
                            {children}
                            <Toaster />
                        </TooltipProvider>
                    </NavigationGuardProvider>
                </FileSelectProvider>
            </BatchJobProvider>
        </AuthProvider>
    );
}
