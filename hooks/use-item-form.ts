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

import { useState, useCallback, useEffect, useRef } from "react";

/**
 * ウィザードステップの定義
 */
export type WizardStep = "upload" | "reorder" | "condition" | "background" | "preview" | "batch_settings";
import { AnalyzeResponse, ItemFormState, ItemStatus, BatchItem } from "@/types";
import { useImageUpload } from "./use-image-upload";
import { useAiAnalysis } from "./use-ai-analysis";
import { useItemStorage } from "./use-item-storage";
import { useBatchJob } from "@/contexts/BatchJobContext";

/**
 * 出品モード
 */
export type ListingMode = "single" | "batch";

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
 */
export function useItemForm(options?: UseItemFormOptions) {
    // =========================================================================
    // 0. モード管理 & Batch状態
    // =========================================================================
    const [mode, setMode] = useState<ListingMode>("single");
    const [isModeSelected, setIsModeSelected] = useState(false);

    /**
     * モード選択ハンドラ
     */
    const selectMode = useCallback((newMode: ListingMode) => {
        setMode(newMode);
        setIsModeSelected(true);
    }, []);

    const [batchItems, setBatchItems] = useState<BatchItem[]>([]);

    // =========================================================================
    // 1. 画像状態（useImageUpload から取得）
    // =========================================================================
    const {
        originalImages,
        setOriginalImages,
        processedImages,
        setProcessedImages,
        selectedFiles,
        handleFilesSelect: onFilesSelect,
        resetImage,
        moveImage,
        reorderImages,
        appendImages,
        removeImage,
    } = useImageUpload();

    // =========================================================================
    // 1.5 BatchItem同期 (画像の増減に合わせてStateを調整)
    // =========================================================================
    // TODO: useImageUpload側で画像削除などが起きた場合、ここも同期する必要がある。
    // シンプルに originalImages.length を監視して同期する。
    // Reorderで順序が変わった場合、batchItemsも追従すべきだが、
    // 現状 reorderImages は originalImages のみを並び替える。
    // batchItems も並び替える必要があるため、reorderImages をラップする。

    /**
     * バッチアイテムの初期値
     */
    const defaultBatchItem: BatchItem = {
        status: "新品、未使用",
        backgroundType: "white",
        title: "",
        description: "",
        price: 0,
    };

    /**
     * 画像が追加されたときに batchItems を拡張する
     * (詳細な同期は reorderImages ラッパーなどで行う)
     */
    if (mode === "batch" && originalImages.length > batchItems.length) {
        const newItems = Array.from({ length: originalImages.length - batchItems.length }).map(() => ({ ...defaultBatchItem }));
        setBatchItems((prev) => [...prev, ...newItems]);
    } else if (mode === "batch" && originalImages.length < batchItems.length) {
        // 画像が減った場合（削除など）
        setBatchItems((prev) => prev.slice(0, originalImages.length));
    }

    /**
     * 一括出品アイテム更新
     */
    const updateBatchItem = useCallback((index: number, updates: Partial<BatchItem>) => {
        setBatchItems((prev) => {
            const next = [...prev];
            if (next[index]) {
                next[index] = { ...next[index], ...updates };
            }
            return next;
        });
    }, []);

    /**
     * 全アイテム一括更新
     */
    const updateAllBatchItems = useCallback((updates: Partial<BatchItem>) => {
        setBatchItems((prev) => prev.map((item) => ({ ...item, ...updates })));
    }, []);

    /**
     * 並び替え（Batch対応）
     */
    const handleReorder = useCallback((newIndices: number[]) => {
        reorderImages(newIndices);
        if (mode === "batch") {
            setBatchItems((prev) => {
                const next = new Array(prev.length);
                newIndices.forEach((oldIndex, newIndex) => {
                    next[newIndex] = prev[oldIndex];
                });
                return next;
            });
        }
        setCurrentPreviewIndex(0); // Auto-select the top image
    }, [reorderImages, mode]);

    // =========================================================================
    // 2. フォーム入力状態
    // =========================================================================
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState(0);
    const [status, setStatus] = useState<ItemStatus | "">("新品、未使用");
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
        // モードに応じて遷移先を変更
        if (mode === "batch") {
            // Batchモードの場合は、ここではreorderに行くが、UI側で表示を変えるか、
            // もしくは即座にbatch_settingsに行く？
            // ユーザー要望: "画像選択したら、一括で商品の背景と商品状態を選ぶ"
            // なので、Reorderステップ（画像確認）はあっても良いが、
            // Batchの場合はReorderステップで "次へ" を押すと Conditionではなく BatchSettingsに行くべき？
            // いったんReorder（確認）へ遷移させるのが自然。
            setCurrentStep("reorder");
        } else {
            setCurrentStep("reorder");
        }
        setCurrentPreviewIndex(0); // リセット
    }, [onFilesSelect, mode]);

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
            if (mode === "batch") {
                switch (prev) {
                    case "upload":
                        return "reorder";
                    case "reorder":
                        return "batch_settings"; // 新しいステップ
                    case "batch_settings":
                        // 今のところPreviewへ。生成フローは後で実装
                        return "preview";
                    // 一括生成の場合は analysis が走るタイミングを制御する必要がある
                    default:
                        return prev;
                }
            } else {
                // 通常モード
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
            }
        });
    }, [mode]);

    /**
     * 前のステップへ戻る
     */
    const goToPrevStep = useCallback(() => {
        setCurrentStep((prev) => {
            if (mode === "batch") {
                switch (prev) {
                    case "reorder":
                        return "upload";
                    case "batch_settings":
                        return "reorder";
                    case "preview":
                        return "batch_settings";
                    default:
                        return prev;
                }
            } else {
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
            }
        });
    }, [mode]);

    /**
     * 指定のステップへ移動
     */
    const goToStep = useCallback((step: WizardStep) => {
        setCurrentStep(step);
    }, []);

    // ... (rest of logic remains mostly same for now, will refactor for batch analysis later)

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
     */
    const onImageProcessed = useCallback((index: number, imageUrl: string | null) => {
        setProcessedImages((prev) => {
            const next = [...prev];
            next[index] = imageUrl ?? originalImages[index] ?? null;
            return next;
        });
    }, [setProcessedImages, originalImages]);

    const onBatchItemAnalyzed = useCallback((index: number, result: AnalyzeResponse) => {
        updateBatchItem(index, {
            title: result.title || "",
            description: result.description || "",
            price: result.price || 0,
        });
    }, [updateBatchItem]);

    const { isAnalyzing, isEditingImage, startAnalysis: performAnalysis, analyzingStates, setAnalyzingStates } = useAiAnalysis({
        selectedFiles,
        status,
        backgroundType,
        onAnalysisSuccess,
        onImageProcessed,
        mode,
        batchItems,
        onBatchItemAnalyzed,
    });

    // =========================================================================
    // 3.5 自動分析トリガー (Batch Mode incremental update)
    // =========================================================================
    const prevFileCountRef = useRef(originalImages.length);

    // =========================================================================
    // 4. 保存処理（useItemStorage から取得）- 依存解決のため上に移動
    // =========================================================================
    const { isSaving, saveItem: performSave, saveBatchItems: performBatchSave } = useItemStorage();

    /**
     * 商品を保存
     */
    const save = useCallback(async () => {
        if (mode === "batch") {
            // 一括保存
            await performBatchSave(processedImages, originalImages, batchItems, options?.onSuccess);
        } else {
            // 通常保存
            const formState: ItemFormState = {
                title,
                description,
                price,
                status: status as ItemStatus,
            };
            await performSave(processedImages, formState, options?.onSuccess, backgroundType);
        }
    }, [mode, processedImages, originalImages, batchItems, title, description, price, status, performSave, performBatchSave, options?.onSuccess]);


    useEffect(() => {
        // Batchモード以外やプレビュー以外では、現在の枚数を追跡するだけにする
        if (mode !== "batch" || currentStep !== "preview") {
            prevFileCountRef.current = originalImages.length;
            return;
        }

        // 画像が増えた場合のみトリガー
        if (originalImages.length > prevFileCountRef.current) {
            // BatchItemの同期を待つ
            if (batchItems.length < originalImages.length) {
                return;
            }

            const addedCount = originalImages.length - prevFileCountRef.current;
            const startIdx = prevFileCountRef.current;

            const newIndices: number[] = [];
            const newFiles: File[] = [];

            for (let i = 0; i < addedCount; i++) {
                const idx = startIdx + i;
                newIndices.push(idx);
                // selectedFiles[idx]が存在することを確認
                if (selectedFiles[idx]) {
                    newFiles.push(selectedFiles[idx]);
                }
            }

            if (newFiles.length > 0) {
                // コンソールログは削除: console.log("Triggering incremental analysis for:", newIndices);
                performAnalysis(newFiles, newIndices);
            }

            // トリガー完了後にrefを更新
            prevFileCountRef.current = originalImages.length;
        } else {
            // 減った場合や変化なしはrefを更新
            prevFileCountRef.current = originalImages.length;
        }
    }, [originalImages.length, batchItems.length, mode, currentStep, selectedFiles, performAnalysis]);

    // =========================================================================
    // 3.7. Batch Job Context Integration
    // =========================================================================
    const { startBatchJob } = useBatchJob();

    /**
     * 分析開始（プレビューステップへ遷移してから実行）
     */
    const startAnalysis = useCallback(async (): Promise<boolean> => {
        if (mode === "batch") {
            if (selectedFiles.length === 0) {
                return false;
            }
            // 一括モード: バックグラウンド処理を開始して即座に完了とする
            // コンテキスト経由でジョブを開始
            // 注意: startBatchJob自体はPromiseを返すが、ここでは待たずにバックグラウンドで走らせる
            startBatchJob(selectedFiles, batchItems);

            // 呼び出し元(page.tsx)で router.push するための完了シグナル
            return true;
        } else {
            setCurrentStep("preview");
            await performAnalysis();
            return true;
        }
    }, [performAnalysis, mode, startBatchJob, selectedFiles, batchItems]);


    /**
     * フォームの状態をリセット
     */
    const reset = useCallback((options?: { keepMode?: boolean }) => {
        // 画像は維持しない（要件によるが、「画像を変更」なら画像はリセットでOK）
        setOriginalImages([]);
        setProcessedImages([]);
        resetImage();
        setCurrentStep("upload");

        if (!options?.keepMode) {
            setMode("single");
            setIsModeSelected(false);
        }
        // keepMode: trueの場合は何もしない（modeとisModeSelectedを維持）

        setStatus("新品、未使用");
        setBackgroundType("white");
        setTitle("");
        setDescription("");
        setPrice(0);
        setCurrentPreviewIndex(0);
        setBatchItems([]);
        setAnalyzingStates([]);
    }, [resetImage, setOriginalImages, setProcessedImages]);

    // =========================================================================
    // 6. 戻り値（UIコンポーネントで使用）
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
        analyzingStates,
        isEditingImage,
        isSaving,

        // ウィザードステップ
        currentStep,
        mode,
        isModeSelected, // Added
        selectMode,     // Added
        setMode,
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
        batchItems,
        updateBatchItem,
        updateAllBatchItems,

        // アクション
        handleFilesSelect,
        addImages: appendImages, // 画像追加
        startAnalysis,
        save,
        reset,
        editImage,
        moveImage,
        reorderImages: handleReorder,
        removeImage,
    };
}
