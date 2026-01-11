/**
 * Zodスキーマ定義
 *
 * このファイルの役割:
 * - 型定義とバリデーションロジックを一元管理
 * - z.infer<typeof Schema> で型を自動生成
 * - API入力、フォーム入力、DBデータの検証に使用
 *
 * Why Zodを使うのか:
 * - ランタイムバリデーション + コンパイル時の型安全を両立
 * - スキーマから型を推論することで、定義の重複を排除
 * - エラーメッセージのカスタマイズが容易
 *
 * Learning:
 * - Zod: https://zod.dev/
 */

import { z } from "zod";
import { STATUS_OPTIONS, PRICE_LIMITS, TITLE_MAX_LENGTH } from "@/lib/constants";

// ============================================================================
// 商品状態スキーマ
// ============================================================================
/**
 * メルカリの商品状態
 *
 * STATUS_OPTIONS から自動生成することで、constants.ts との同期を保証
 */
export const ItemStatusSchema = z.enum(STATUS_OPTIONS);

// ============================================================================
// 商品スキーマ (DBスキーマ対応)
// ============================================================================
/**
 * 商品データスキーマ
 *
 * Supabaseの items テーブルに対応
 */
export const ItemSchema = z.object({
    id: z.string().uuid(),
    user_id: z.string().uuid().optional(),
    image_url: z.string().url(),
    title: z.string().min(1).max(TITLE_MAX_LENGTH),
    description: z.string().min(1),
    price: z.number().int().min(PRICE_LIMITS.min).max(PRICE_LIMITS.max),
    status: ItemStatusSchema,
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    created_at: z.string(),
    updated_at: z.string().optional(),
});

// ============================================================================
// フォーム状態スキーマ
// ============================================================================
/**
 * 商品フォームの状態スキーマ
 *
 * ItemSchemaとの違い:
 * - id, user_id, created_at などフォーム入力不要なフィールドを除外
 * - status は未選択状態（空文字）を許可
 */
export const ItemFormSchema = z.object({
    title: z.string().min(1, "タイトルを入力してください").max(TITLE_MAX_LENGTH),
    description: z.string().min(1, "説明文を入力してください"),
    price: z.number().int().min(PRICE_LIMITS.min).max(PRICE_LIMITS.max),
    status: z.union([ItemStatusSchema, z.literal("")]),
});

// ============================================================================
// APIレスポンススキーマ
// ============================================================================
/**
 * /api/analyze レスポンススキーマ
 */
export const AnalyzeResponseSchema = z.object({
    title: z.string(),
    description: z.string(),
    price: z.number(),
    tags: z.array(z.string()),
    prohibited: z.boolean(),
    prohibitedReason: z.string(),
});

/**
 * /api/edit-image レスポンススキーマ
 */
export const EditImageResponseSchema = z.object({
    success: z.boolean(),
    imageUrl: z.string().optional(),
    error: z.string().optional(),
});

// ============================================================================
// 型エクスポート (z.inferで自動生成)
// ============================================================================
export type ItemStatus = z.infer<typeof ItemStatusSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type ItemFormState = z.infer<typeof ItemFormSchema>;
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
export type EditImageResponse = z.infer<typeof EditImageResponseSchema>;
