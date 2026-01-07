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
        originalImage,
        processedImage,
        setProcessedImage,
        selectedFile,
        handleImageSelect: onImageSelect,
        resetImage,
    } = useImageUpload();

    // =========================================================================
    // 2. フォーム入力状態
    // =========================================================================
    /**
     * Why useStateを個別に使うのか:
     * - React Hook Formを使わない理由: 学習目的でシンプルな実装を採用
     * - フィールドが少ないため、個別管理で十分
     * - 将来的に複雑化したらReact Hook Formへの移行を検討
     */
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState(0);
    const [status, setStatus] = useState<ItemStatus | "">("");
    /** 背景タイプ（デフォルト: 白スタジオ） */
    const [backgroundType, setBackgroundType] = useState("white");

    /** 商品状態選択ステップの表示フラグ */
    const [showStatusStep, setShowStatusStep] = useState(false);

    /**
     * 画像選択ハンドラー（状態選択ステップを表示）
     *
     * Why ラッパー関数を作るのか:
     * - 画像選択 → 状態選択ステップ表示の連携
     * - useImageUploadのhandleImageSelectを拡張
     */
    const handleImageSelect = useCallback((file: File) => {
        onImageSelect(file);
        setShowStatusStep(true);
    }, [onImageSelect]);

    // =========================================================================
    // 3. AI分析（useAiAnalysis から取得）
    // =========================================================================
    /**
     * AI分析成功時のコールバック
     *
     * What this does:
     * - AI生成結果をフォーム状態に反映
     * - タイトル、説明文、価格を自動入力
     */
    const onAnalysisSuccess = useCallback((result: AnalyzeResponse) => {
        setTitle(result.title || "");
        setDescription(result.description || "");
        setPrice(result.price || 0);
    }, []);

    /**
     * 画像編集成功時のコールバック
     */
    const onImageEditSuccess = useCallback((imageUrl: string) => {
        setProcessedImage(imageUrl);
    }, [setProcessedImage]);

    /**
     * 画像編集スキップ時のコールバック
     *
     * Why URL.createObjectURLを使うのか:
     * - Fileオブジェクトから表示用URLを生成
     * - Base64変換より軽量
     * - コンポーネントのアンマウント時にrevokeObjectURLが必要（要改善点）
     */
    const onImageEditSkip = useCallback(() => {
        if (selectedFile) {
            setProcessedImage(URL.createObjectURL(selectedFile));
        }
    }, [selectedFile, setProcessedImage]);

    const { isAnalyzing, isEditingImage, startAnalysis: performAnalysis } = useAiAnalysis({
        selectedFile,
        status,
        backgroundType,
        onAnalysisSuccess,
        onImageEditSuccess,
        onImageEditSkip,
    });

    /**
     * 分析開始（状態選択ステップを非表示にしてから実行）
     */
    const startAnalysis = useCallback(async () => {
        setShowStatusStep(false);
        await performAnalysis();
    }, [performAnalysis]);

    // =========================================================================
    // 4. 保存処理（useItemStorage から取得）
    // =========================================================================
    const { isSaving, saveItem: performSave } = useItemStorage();

    /**
     * 商品を保存
     *
     * What this does:
     * - フォーム状態をItemFormState型にまとめる
     * - useItemStorageのsaveItemを呼び出し
     */
    const save = useCallback(async () => {
        if (!processedImage) return;

        const formState: ItemFormState = {
            title,
            description,
            price,
            status,
        };

        await performSave(processedImage, formState, options?.onSuccess);
    }, [processedImage, title, description, price, status, performSave, options?.onSuccess]);

    // =========================================================================
    // 5. リセット処理
    // =========================================================================
    /**
     * 全状態をリセット
     *
     * What this does:
     * - 画像状態をクリア
     * - フォーム入力をクリア
     * - 表示ステップをリセット
     */
    const reset = useCallback(() => {
        resetImage();
        setShowStatusStep(false);
        setStatus("");
        setBackgroundType("white");
        setTitle("");
        setDescription("");
        setPrice(0);
    }, [resetImage]);

    // =========================================================================
    // 戻り値（UIコンポーネントで使用）
    // =========================================================================
    return {
        // 画像
        originalImage,
        processedImage,
        selectedFile,

        // ローディング状態
        isAnalyzing,
        isEditingImage,
        isSaving,
        showStatusStep,

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
        handleImageSelect,
        startAnalysis,
        save,
        reset,
    };
}
