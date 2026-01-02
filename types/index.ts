/**
 * 共通型定義
 * プロジェクト全体で使用する型を一元管理
 */

// ============================================================================
// 商品の状態（lib/constants.tsと同期）
// ============================================================================
export type ItemStatus =
    | "新品、未使用"
    | "未使用に近い"
    | "目立った傷や汚れなし"
    | "やや傷や汚れあり"
    | "傷や汚れあり"
    | "全体的に状態が悪い";

// ============================================================================
// 商品型（DBスキーマ対応）
// ============================================================================
export interface Item {
    id: string;
    user_id?: string;
    image_url: string;
    title: string;
    description: string;
    price: number;
    status: string;
    category?: string;
    tags?: string[];
    created_at: string;
    updated_at?: string;
}

// ============================================================================
// API レスポンス型
// ============================================================================

/** /api/analyze のレスポンス */
export interface AnalyzeResponse {
    title: string;
    description: string;
    price: number;
    tags: string[];
    prohibited: boolean;
    prohibitedReason: string;
}

/** /api/edit-image のレスポンス */
export interface EditImageResponse {
    success: boolean;
    imageUrl?: string;
    error?: string;
}

// ============================================================================
// フォーム状態
// ============================================================================
export interface ItemFormState {
    title: string;
    description: string;
    price: number;
    status: string;
}
