/**
 * 商品フォームフック（統合フック）
 *
 * このフックの役割:
 * - 商品出品フローの全状態を統合管理
 * - 画像、フォーム、AI分析、保存の各フックを組み合わせ
 * - UIコンポーネントに統一されたインターフェースを提供
 *
 * Why 統合フックを作るのか:
 * - 関連する状態とロジックを1つにまとめる（Colocation）
 * - コンポーネントのpropsドリリングを軽減
 * - 各機能のカスタムフックは単一責任を維持しつつ、統合フックで連携
 *
 * 設計パターン:
 * - Composite Hook Pattern: 複数のフックを組み合わせる
 * - Facade Pattern: 複雑な内部構造をシンプルなインターフェースで隠蔽
 *
 * Alternatives:
 * - Context API: グローバル状態が必要な場合に検討
 * - Zustand/Jotai: より複雑な状態管理が必要な場合
 * - 今回は単一ページ内の状態なので、フック合成で十分
 *
 * Learning:
 * - Custom Hooks: https://react.dev/learn/reusing-logic-with-custom-hooks
 * - Thinking in React: https://react.dev/learn/thinking-in-react
 */

"use client";

import { useState, useCallback } from "react";

/**
 * ウィザードステップの定義
 */
export type WizardStep = "upload" | "reorder" | "condition" | "background" | "preview";
import { AnalyzeResponse, ItemFormState, ItemStatus } from "@/types";
import { useImageUpload } from "./use-image-upload";
import { useAiAnalysis } from "./use-ai-analysis";
import { useItemStorage } from "./use-item-storage";

/**
 * フックのオプション
 */
interface UseItemFormOptions {
    /** 保存成功時のコールバック */
    onSuccess?: () => void;
}

/**
 * 商品フォーム統合フック
 *
 * 状態管理の構成:
 * 1. 画像状態（useImageUpload）
 * 2. フォーム入力（useState）
 * 3. AI分析（useAiAnalysis）
 * 4. 保存処理（useItemStorage）
 *
 * @param options - オプション設定
 * @returns フォームの全状態とアクション
 *
 * @example
 * ```tsx
 * function ListingPage() {
 *   const {
 *     originalImage,
 *     handleImageSelect,
 *     title,
 *     setTitle,
 *     // ...
 *   } = useItemForm();
 *
 *   // UIを構築
 * }
 * ```
 */
export function useItemForm(options?: UseItemFormOptions) {
    // =========================================================================
    // 1. 画像状態（useImageUpload から取得）
    // =========================================================================
    const {
        originalImages,
        processedImages,
        setProcessedImages,
        selectedFiles,
        handleFilesSelect: onFilesSelect,
        resetImage,
        moveImage,
        reorderImages,
    } = useImageUpload();

    // =========================================================================
    // 2. フォーム入力状態
    // =========================================================================
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState(0);
    const [status, setStatus] = useState<ItemStatus | "">("");
    /** 背景タイプ（デフォルト: 白スタジオ） */
    const [backgroundType, setBackgroundType] = useState("white");

    /** 現在のウィザードステップ */
    const [currentStep, setCurrentStep] = useState<WizardStep>("upload");

    /** 現在プレビュー中の画像インデックス */
    const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

    /**
     * 画像選択ハンドラー（並び替えステップへ遷移）
     */
    const handleFilesSelect = useCallback((files: File[]) => {
        onFilesSelect(files);
        setCurrentStep("reorder");
        setCurrentPreviewIndex(0); // リセット
    }, [onFilesSelect]);

    /**
     * 画像編集（並び替え）ステップに戻る
     */
    const editImage = useCallback(() => {
        setCurrentStep("reorder");
    }, []);

    /**
     * 次のステップへ進む
     */
    const goToNextStep = useCallback(() => {
        setCurrentStep((prev) => {
            switch (prev) {
                case "upload":
                    return "reorder";
                case "reorder":
                    return "condition";
                case "condition":
                    return "background";
                case "background":
                    return "preview";
                default:
                    return prev;
            }
        });
    }, []);

    /**
     * 前のステップへ戻る
     */
    const goToPrevStep = useCallback(() => {
        setCurrentStep((prev) => {
            switch (prev) {
                case "reorder":
                    return "upload";
                case "condition":
                    return "reorder";
                case "background":
                    return "condition";
                case "preview":
                    return "background";
                default:
                    return prev;
            }
        });
    }, []);

    /**
     * 指定のステップへ移動
     */
    const goToStep = useCallback((step: WizardStep) => {
        setCurrentStep(step);
    }, []);

    // =========================================================================
    // 3. AI分析（useAiAnalysis から取得）
    // =========================================================================
    /**
     * AI分析成功時のコールバック（テキスト）
     */
    const onAnalysisSuccess = useCallback((result: AnalyzeResponse) => {
        setTitle(result.title || "");
        setDescription(result.description || "");
        setPrice(result.price || 0);
    }, []);

    /**
     * 個別の画像処理完了時のコールバック
     * 
     * Why ここで更新するのか:
     * - 各画像の処理が終わるたびにUIを更新するため
     * - 失敗時(imageUrlがnull)はオリジナル画像にフォールバック
     */
    const onImageProcessed = useCallback((index: number, imageUrl: string | null) => {
        setProcessedImages((prev) => {
            const next = [...prev];
            // 成功ならそのURL、失敗ならオリジナル画像、それもなければnull
            next[index] = imageUrl ?? originalImages[index] ?? null;
            return next;
        });
    }, [setProcessedImages, originalImages]);

    const { isAnalyzing, isEditingImage, startAnalysis: performAnalysis } = useAiAnalysis({
        selectedFiles,
        status,
        backgroundType,
        onAnalysisSuccess,
        onImageProcessed,
    });

    /**
     * 分析開始（プレビューステップへ遷移してから実行）
     */
    const startAnalysis = useCallback(async () => {
        setCurrentStep("preview");
        await performAnalysis();
    }, [performAnalysis]);

    // =========================================================================
    // 4. 保存処理（useItemStorage から取得）
    // =========================================================================
    const { isSaving, saveItem: performSave } = useItemStorage();

    /**
     * 商品を保存
     */
    const save = useCallback(async () => {
        // processedImagesの中身が有効かはsaveItem内でチェック
        const formState: ItemFormState = {
            title,
            description,
            price,
            status,
        };

        await performSave(processedImages, formState, options?.onSuccess);
    }, [processedImages, title, description, price, status, performSave, options?.onSuccess]);

    // =========================================================================
    // 5. リセット処理
    // =========================================================================
    const reset = useCallback(() => {
        resetImage();
        setCurrentStep("upload");
        setStatus("");
        setBackgroundType("white");
        setTitle("");
        setDescription("");
        setPrice(0);
        setCurrentPreviewIndex(0);
    }, [resetImage]);

    // =========================================================================
    // 戻り値（UIコンポーネントで使用）
    // =========================================================================
    return {
        // 画像
        originalImages,
        processedImages,
        selectedFiles,
        currentPreviewIndex,
        setCurrentPreviewIndex,

        // ローディング状態
        isAnalyzing,
        isEditingImage,
        isSaving,

        // ウィザードステップ
        currentStep,
        goToNextStep,
        goToPrevStep,
        goToStep,

        // フォームフィールド
        title,
        setTitle,
        description,
        setDescription,
        price,
        setPrice,
        status,
        setStatus,
        backgroundType,
        setBackgroundType,

        // アクション
        handleFilesSelect,
        startAnalysis,
        save,
        reset,
        editImage,
        moveImage,
        reorderImages,
    };
}
