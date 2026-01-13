/**
 * 共通型定義
 *
 * このファイルの役割:
 * - プロジェクト全体で使用する型を一元管理
 * - lib/schemas/item.ts のZodスキーマから型を再エクスポート
 *
 * Why Zodスキーマから型を推論するのか:
 * - 型定義とバリデーションロジックの二重管理を防止
 * - スキーマを変更すれば型も自動的に更新される
 * - Single Source of Truth (唯一の信頼できる情報源)
 *
 * Learning:
 * - Zod Type Inference: https://zod.dev/?id=type-inference
 */

// ============================================================================
// Zodスキーマから推論された型を再エクスポート
// ============================================================================
export type {
    ItemStatus,
    Item,
    ItemFormState,
    AnalyzeResponse,
    EditImageResponse,
} from "@/lib/schemas/item";

// ============================================================================
// Zodスキーマも必要に応じてエクスポート
// ============================================================================
export {
    ItemStatusSchema,
    ItemSchema,
    ItemFormSchema,
    AnalyzeResponseSchema,
    EditImageResponseSchema,
} from "@/lib/schemas/item";

/**
 * 一括出品時の各商品設定
 */
export interface BatchItem {
    status: ItemStatus;
    backgroundType: string;
    title: string;
    description: string;
    price: number;
}
