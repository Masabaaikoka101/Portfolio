/**
 * ファイル選択コンテキスト
 *
 * このコンテキストの役割:
 * - ヘッダーの「新規作成」ボタンからファイル選択を可能にする
 * - 選択されたファイルをホームページに渡す
 *
 * Why Contextを使うのか:
 * - ヘッダーとホームページ間でファイルを共有
 * - propsドリリングを避ける
 * - グローバルなファイル選択状態を管理
 *
 * Learning:
 * - React Context: https://react.dev/learn/passing-data-deeply-with-context
 */

"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface FileSelectContextType {
    /** 選択されたファイル */
    selectedFile: File | null;
    /** ファイルを選択 */
    selectFile: (file: File) => void;
    /** 選択をクリア */
    clearFile: () => void;
}

const FileSelectContext = createContext<FileSelectContextType | undefined>(undefined);

/**
 * ファイル選択プロバイダー
 */
export function FileSelectProvider({ children }: { children: ReactNode }) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const selectFile = useCallback((file: File) => {
        setSelectedFile(file);
    }, []);

    const clearFile = useCallback(() => {
        setSelectedFile(null);
    }, []);

    return (
        <FileSelectContext.Provider value={{ selectedFile, selectFile, clearFile }}>
            {children}
        </FileSelectContext.Provider>
    );
}

/**
 * ファイル選択コンテキストを使用するフック
 */
export function useFileSelect() {
    const context = useContext(FileSelectContext);
    if (context === undefined) {
        throw new Error("useFileSelect must be used within a FileSelectProvider");
    }
    return context;
}
