/**
 * 画像アップローダーコンポーネント
 *
 * このコンポーネントの役割:
 * - ドラッグ＆ドロップまたはクリックで画像をアップロード
 * - 選択した画像のプレビュー表示
 * - 画像のクリア機能
 *
 * Why コンポーネントとして分離するのか:
 * - 画像アップロードUIは再利用性が高い
 * - ドラッグ＆ドロップのロジックをカプセル化
 * - EmptyState等、複数の場所から呼び出し可能
 *
 * 設計パターン:
 * - Controlled Component風: onImageSelect で親に通知
 * - 内部状態（preview）は表示のみに使用
 *
 * Learning:
 * - Drag and Drop API: https://developer.mozilla.org/ja/docs/Web/API/HTML_Drag_and_Drop_API
 * - FileReader API: https://developer.mozilla.org/ja/docs/Web/API/FileReader
 * - next/image: https://nextjs.org/docs/app/api-reference/components/image
 */

"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Props型
 */
interface ImageUploaderProps {
    /** 画像選択時のコールバック */
    onImageSelect: (file: File) => void;
    /** 追加のCSSクラス */
    className?: string;
}

/**
 * 画像アップローダーコンポーネント
 *
 * Why ローカルにpreview状態を持つのか:
 * - 画像選択直後にプレビューを表示するため
 * - 親コンポーネントの状態更新を待つとチラつく可能性
 * - onImageSelectと独立して高速にUI更新
 *
 * @param props - コンポーネントのprops
 */
export function ImageUploader({ onImageSelect, className }: ImageUploaderProps) {
    /** プレビュー画像（Base64 Data URL） */
    const [preview, setPreview] = useState<string | null>(null);

    /** ドラッグ中フラグ（スタイル変更用） */
    const [isDragging, setIsDragging] = useState(false);

    /**
     * 隠しファイル入力への参照
     *
     * Why refを使うのか:
     * - クリック時にプログラム的にファイル選択ダイアログを開く
     * - DOMに直接アクセスする必要があるため
     */
    const fileInputRef = useRef<HTMLInputElement>(null);

    /**
     * ファイル処理（共通処理）
     *
     * What this does:
     * 1. 画像ファイルかチェック
     * 2. FileReaderでBase64に変換してプレビュー設定
     * 3. 親コンポーネントに通知
     */
    const handleFile = (file: File) => {
        if (!file.type.startsWith("image/")) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            setPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        onImageSelect(file);
    };

    // =========================================================================
    // ドラッグ＆ドロップイベントハンドラー
    // =========================================================================
    /**
     * Why preventDefault()が必要か:
     * - ブラウザのデフォルト動作（新しいタブで画像を開く等）を防止
     */
    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    // =========================================================================
    // クリック関連ハンドラー
    // =========================================================================
    const onClickUpload = () => {
        fileInputRef.current?.click();
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            handleFile(e.target.files[0]);
        }
    };

    /**
     * 画像クリア
     *
     * Why stopPropagation()が必要か:
     * - 親要素のonClickイベント（ファイル選択ダイアログを開く）が発火するのを防止
     */
    const clearImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // =========================================================================
    // レンダリング
    // =========================================================================
    return (
        <Card
            className={cn(
                "relative w-full overflow-hidden transition-all duration-300 ease-in-out border-dashed",
                isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50",
                preview ? "border-solid border-gray-200" : "border-2",
                className
            )}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={!preview ? onClickUpload : undefined}
        >
            {/* 隠しファイル入力 */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                accept="image/*"
                className="hidden"
            />

            {preview ? (
                // プレビュー表示状態
                <div className="relative aspect-square w-full md:aspect-[4/3]">
                    <Image
                        src={preview}
                        alt="Uploaded image"
                        fill
                        className="object-contain"
                        unoptimized // Base64画像のため最適化をスキップ
                    />
                    <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-2 h-8 w-8 rounded-full shadow-md hover:bg-red-100 hover:text-red-600"
                        onClick={clearImage}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                // アップロード待ち状態
                <div className="flex flex-col items-center justify-center py-16 text-center cursor-pointer">
                    <div className="mb-4 rounded-full bg-gray-100 p-4 transition-colors group-hover:bg-gray-200">
                        <Upload className="h-8 w-8 text-gray-500" />
                    </div>
                    <h3 className="mb-1 text-lg font-semibold text-gray-900">
                        写真をアップロード
                    </h3>
                    <p className="text-sm text-gray-500">
                        ここにドラッグ＆ドロップ、またはクリックして選択
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                        PNG, JPG, WEBP (最大 10MB)
                    </p>
                </div>
            )}
        </Card>
    );
}
