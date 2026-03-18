/**
 * プレビューステップコンポーネント
 *
 * このコンポーネントの役割:
 * - AI生成結果のプレビューと編集UI
 * - 保存・リセット機能へのアクセス
 *
 * Why 別コンポーネントとして分離するのか:
 * - ページコンポーネントをシンプルに保つ
 * - MercariPreviewへのprops渡しを整理
 * - リセットボタンの配置を一元管理
 *
 * 設計パターン:
 * - Container Component: MercariPreviewとリセットボタンをまとめる
 * - Props Forwarding: 多くのpropsをMercariPreviewに転送
 *
 * Note:
 * - editable={true}で編集モードを有効化
 * - MercariPreviewは表示専用モードも対応（履歴詳細ページで使用）
 *
 * Learning:
 * - React Props Drilling: https://react.dev/learn/passing-props-to-a-component
 */

"use client";

import React, { useState } from "react";
import { MercariPreview } from "@/components/mercari-preview";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import type { ItemStatus, BatchItem } from "@/types";

interface PreviewStepProps {
    /** 処理済み画像リスト */
    processedImages: (string | null)[];
    /** オリジナル画像リスト */
    originalImages: string[];
    /** テキスト分析中フラグ */
    isAnalyzing: boolean;
    /** 現在のプレビュー位置 */
    currentPreviewIndex: number;
    /** プレビュー位置変更コールバック */
    setCurrentPreviewIndex: (index: number) => void;

    /** 商品タイトル */
    title: string;
    /** 商品説明文 */
    description: string;
    /** 価格 */
    price: number;
    /** 商品の状態 */
    status: ItemStatus | "";
    /** 保存中フラグ */
    isSaving: boolean;
    /** タイトル変更コールバック */
    setTitle: (value: string) => void;
    /** 説明文変更コールバック */
    setDescription: (value: string) => void;
    /** 価格変更コールバック */
    setPrice: (value: number) => void;
    /** 状態変更コールバック */
    setStatus: (value: ItemStatus | "") => void;
    /** 保存ボタンクリックコールバック */
    onSave: () => void;
    /** リセットボタンクリックコールバック */
    onReset: () => void;
    /** 画像編集ボタンクリックコールバック */
    onEditImage: () => void;
    /** 出品モード */
    mode?: "single" | "batch";
    /** バッチアイテムリスト */
    batchItems?: BatchItem[];
    /** バッチアイテム更新コールバック */
    updateBatchItem?: (index: number, updates: Partial<BatchItem>) => void;
    /** 並び替えコールバック */
    onReorder?: (newOrderIndices: number[]) => void;
    /** 画像追加コールバック */
    onAddImage?: (files: File[]) => void;
    /** 画像削除コールバック */
    onDeleteImage?: (index: number) => void;
    /** アイテムごとの分析状態 */
    analyzingStates?: boolean[];
    /** AI再生成コールバック */
    onRegenerate?: () => void;
}

/**
 * プレビューステップコンポーネント
 */
export function PreviewStep({
    processedImages,
    originalImages,
    isAnalyzing,
    currentPreviewIndex,
    setCurrentPreviewIndex,
    title,
    description,
    price,
    status,
    isSaving,
    setTitle,
    setDescription,
    setPrice,
    setStatus,
    onSave,
    onReset,
    onEditImage,
    mode = "single",
    batchItems = [],
    updateBatchItem,
    onReorder,
    onAddImage,
    onDeleteImage,
    analyzingStates,
    onRegenerate,
}: PreviewStepProps) {
    // 編集モード状態（デフォルトは閲覧モード。編集ボタンで切替）
    const [isEditing, setIsEditing] = useState(false);

    // 編集開始時の初期値を保持（Dirty Check用）
    const [initialValues, setInitialValues] = useState<{
        title: string;
        description: string;
        price: number;
        status: string;
        images: (string | null)[];
    } | null>(null);

    // 各画像の処理状態 (nullなら処理中)
    const loadingStates = processedImages.map(img => img === null);

    // バッチモードの場合は現在のインデックスのアイテムデータを使用
    const isBatch = mode === "batch";
    const currentBatchItem = isBatch ? batchItems[currentPreviewIndex] : null;

    // 表示する値の解決
    const displayTitle = isBatch ? (currentBatchItem?.title || "") : title;
    const displayDescription = isBatch ? (currentBatchItem?.description || "") : description;
    const displayPrice = isBatch ? (currentBatchItem?.price || 0) : price;
    const displayStatus = isBatch ? (currentBatchItem?.status || "") : status;

    // Dirty Check: 初期値と現在値を比較
    const isDirty = React.useMemo(() => {
        if (!initialValues || !isEditing) return false;
        if (displayTitle !== initialValues.title) return true;
        if (displayDescription !== initialValues.description) return true;
        if (displayPrice !== initialValues.price) return true;
        if (displayStatus !== initialValues.status) return true;
        // 画像の比較
        const currentImgStr = processedImages.filter(Boolean).join(',');
        const initialImgStr = initialValues.images.filter(Boolean).join(',');
        if (currentImgStr !== initialImgStr) return true;
        return false;
    }, [displayTitle, displayDescription, displayPrice, displayStatus, processedImages, initialValues, isEditing]);

    // 編集開始時に初期値を保存
    const handleStartEditing = () => {
        setInitialValues({
            title: displayTitle,
            description: displayDescription,
            price: displayPrice,
            status: displayStatus,
            images: [...processedImages],
        });
        setIsEditing(true);
    };



    // ナビゲーションガード付きアクション実行
    // 戻り値: true = 続行OK, false = キャンセル
    const confirmNavigationWithSave = async (actionName: string): Promise<boolean> => {
        if (!isDirty) return true;

        const result = window.confirm(
            `変更内容が保存されていません。\n\n「OK」を押すと変更を保存してから${actionName}します。\n「キャンセル」を押すと、このまま編集を続けます。`
        );

        if (result) {
            // 保存してから続行
            await onSave();
            setIsEditing(false);
            setInitialValues(null);
            return true;
        }
        return false;
    };

    // 画像選択（サムネイルクリック時）
    // バッチモードでは異なるアイテムに移動するためナビゲーションガードが必要
    // 単品モードでは同じアイテムの異なる画像を表示するだけなのでガード不要
    const handleImageSelect = async (index: number) => {
        if (index === currentPreviewIndex) return;

        // バッチモードかつ編集中に変更がある場合のみガード
        if (isBatch && isEditing && isDirty) {
            const confirmed = await confirmNavigationWithSave("次の商品に移動");
            if (!confirmed) return;
        }

        // バッチモードで編集中の場合、新しいアイテムの初期値を設定
        if (isBatch && isEditing) {
            const newBatchItem = batchItems[index];
            if (newBatchItem) {
                setInitialValues({
                    title: newBatchItem.title || "",
                    description: newBatchItem.description || "",
                    price: newBatchItem.price || 0,
                    status: newBatchItem.status || "",
                    images: [...processedImages],
                });
            }
        }

        setCurrentPreviewIndex(index);
    };

    // リセットハンドラー（ナビゲーションガード付き）
    const handleReset = async () => {
        if (isEditing && isDirty) {
            const result = window.confirm(
                "変更内容が保存されていません。\n\nリセットすると、すべての変更が失われます。続行しますか？"
            );
            if (!result) return;
        }
        setIsEditing(false);
        setInitialValues(null);
        onReset();
    };

    // 更新ハンドラー
    const handleTitleChange = (val: string) => {
        if (isBatch && updateBatchItem) {
            updateBatchItem(currentPreviewIndex, { title: val });
        } else {
            setTitle(val);
        }
    };

    const handleDescriptionChange = (val: string) => {
        if (isBatch && updateBatchItem) {
            updateBatchItem(currentPreviewIndex, { description: val });
        } else {
            setDescription(val);
        }
    };

    const handlePriceChange = (val: number) => {
        if (isBatch && updateBatchItem) {
            updateBatchItem(currentPreviewIndex, { price: val });
        } else {
            setPrice(val);
        }
    };

    const handleStatusChange = (val: ItemStatus | "") => {
        if (isBatch && updateBatchItem) {
            if (val !== "") {
                updateBatchItem(currentPreviewIndex, { status: val as ItemStatus });
            }
        } else {
            setStatus(val);
        }
    };

    // 保存成功後に初期値を更新
    const handleSave = async () => {
        await onSave();
        // 保存後は初期値を更新して dirty 状態をリセット
        setInitialValues({
            title: displayTitle,
            description: displayDescription,
            price: displayPrice,
            status: displayStatus,
            images: [...processedImages],
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* ヘッダー with 編集ボタン */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-700">
                    {isBatch ? `出品プレビュー (${currentPreviewIndex + 1}/${processedImages.length})` : "出品プレビュー"}
                </h2>
                {!isEditing && (
                    <Button onClick={handleStartEditing} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Pencil className="h-4 w-4 mr-2" />
                        編集する
                    </Button>
                )}
                {/* 編集モード中は「更新」ボタンで保存＆終了（MercariPreview内に配置） */}
            </div>

            {/* メインプレビュー */}
            <div>
                <MercariPreview
                    images={processedImages}
                    originalImages={originalImages}
                    loadingStates={loadingStates}
                    isAnalyzing={mode === "batch" ? (analyzingStates?.[currentPreviewIndex] ?? false) : isAnalyzing}
                    selectedIndex={currentPreviewIndex}
                    onImageSelect={handleImageSelect}
                    title={displayTitle}
                    description={displayDescription}
                    price={displayPrice}
                    status={displayStatus as ItemStatus}
                    onSave={handleSave}
                    saveLabel="保存して終了"
                    isSaving={isSaving}
                    editable={isEditing}
                    onTitleChange={isEditing ? handleTitleChange : undefined}
                    onDescriptionChange={isEditing ? handleDescriptionChange : undefined}
                    onPriceChange={isEditing ? handlePriceChange : undefined}
                    onStatusChange={isEditing ? (value) => handleStatusChange(value) : undefined}
                    onEditImage={isEditing ? onEditImage : undefined}
                    mode={mode}
                    onReorder={isEditing ? onReorder : undefined}
                    onAddImage={isEditing ? onAddImage : undefined}
                    onDeleteImage={isEditing ? onDeleteImage : undefined}
                    onRegenerate={isEditing ? onRegenerate : undefined}
                />
            </div>

            {/* リセットリンク */}
            <div className="flex justify-center pt-4">
                <button
                    onClick={handleReset}
                    className="text-sm text-gray-500 hover:text-red-500 underline"
                >
                    リセットしてやり直す
                </button>
            </div>
        </div>
    );
}
