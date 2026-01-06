/**
 * 画像アップロードフック
 *
 * このフックの役割:
 * - 画像ファイルの選択とプレビュー表示を管理
 * - オリジナル画像と処理済み画像の状態を分離管理
 *
 * Why カスタムフックに分離するのか:
 * - 関心の分離: 画像処理ロジックをUIから分離
 * - 再利用性: 複数のコンポーネントで同じロジックを共有可能
 * - テスタビリティ: フック単体でテスト可能
 *
 * 状態の説明:
 * - originalImage: ユーザーが選択した元画像（Base64 Data URL）
 * - processedImage: AI編集後の画像、または編集スキップ時はオリジナル
 * - selectedFile: File オブジェクト（APIへのアップロードに使用）
 *
 * Learning:
 * - React Custom Hooks: https://react.dev/learn/reusing-logic-with-custom-hooks
 * - FileReader API: https://developer.mozilla.org/ja/docs/Web/API/FileReader
 */

import { useState, useCallback } from "react";

/**
 * 画像アップロード管理フック
 *
 * Why useStateを複数使うのか:
 * - 各状態が独立しており、一緒に更新されるとは限らない
 * - originalImageは選択時に設定、processedImageはAI処理後に設定
 * - useReducerを使う選択肢もあるが、状態が単純なためuseStateで十分
 *
 * @returns 画像状態と操作関数
 *
 * @example
 * ```tsx
 * const { originalImage, handleImageSelect } = useImageUpload();
 *
 * return (
 *   <input
 *     type="file"
 *     onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])}
 *   />
 * );
 * ```
 */
export function useImageUpload() {
    /**
     * オリジナル画像（Base64 Data URL）
     *
     * Why Base64で保持するのか:
     * - <img src={...}> で直接表示可能
     * - File オブジェクトは表示に変換が必要
     */
    const [originalImage, setOriginalImage] = useState<string | null>(null);

    /**
     * 処理済み画像
     *
     * Why 別の状態として管理するのか:
     * - AI画像編集の結果を保持
     * - 編集失敗時はオリジナルにフォールバック
     * - Before/After比較表示に使用
     */
    const [processedImage, setProcessedImage] = useState<string | null>(null);

    /**
     * 選択されたファイル
     *
     * Why File オブジェクトも保持するのか:
     * - API送信時にはFileオブジェクトが必要（FormDataに追加）
     * - Base64からBlobに変換するより効率的
     */
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    /**
     * 画像選択ハンドラー
     *
     * Why useCallbackを使うのか:
     * - 関数の参照を安定させ、不要な再レンダリングを防止
     * - 依存配列が空なので、コンポーネントのライフサイクル通して同一参照
     *
     * Why FileReaderを使うのか:
     * - ファイルをBase64に変換してプレビュー表示
     * - URL.createObjectURL()も選択肢だが、メモリリーク対策が必要
     */
    const handleImageSelect = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setOriginalImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        setSelectedFile(file);
        // 新しい画像選択時は処理済み画像をリセット
        setProcessedImage(null);
    }, []);

    /**
     * 画像リセット
     *
     * Why 別関数として定義するのか:
     * - 「やり直す」ボタンから呼び出す
     * - 全ての状態を一括でクリア
     */
    const resetImage = useCallback(() => {
        setOriginalImage(null);
        setProcessedImage(null);
        setSelectedFile(null);
    }, []);

    return {
        // 状態
        originalImage,
        processedImage,
        setProcessedImage, // 外部から設定可能（AI編集結果を受け取るため）
        selectedFile,

        // アクション
        handleImageSelect,
        resetImage,
    };
}
