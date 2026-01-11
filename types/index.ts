/**
 * 共通型定義
 *
 * このファイルの役割:
 * - プロジェクト全体で使用する型を一元管理
 * - API、DB、フォームで共通の型を定義し、型安全を担保
 *
 * Why 型定義を分離するのか:
 * - 型の変更が発生した際、影響範囲を即座に把握できる
 * - IDEの補完機能を最大限活用できる
 * - 実行時エラーをコンパイル時に検出できる
 *
 * Alternatives:
 * - Zodスキーマから型を生成する方法もあるが、学習目的で手動定義を採用
 * - Supabase CLIの `supabase gen types` で自動生成も可能だが、
 *   型の意味を理解するため手動定義を優先
 *
 * Learning:
 * - TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
 * - Union Types: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
 */

// ============================================================================
// 商品の状態（メルカリの選択肢に準拠）
// ============================================================================
/**
 * メルカリの商品状態選択肢
 *
 * Why Union Typeを使うのか:
 * - 文字列リテラル型により、タイポを防止
 * - IDEで選択肢が自動補完される
 * - 無効な値が渡された場合、コンパイル時にエラー
 *
 * Alternatives:
 * - enumを使う方法もあるが、Tree-shakingの観点でUnion Typeを採用
 * - 参考: https://www.typescriptlang.org/docs/handbook/enums.html#const-enums
 *
 * Note:
 * - lib/constants.ts の STATUS_OPTIONS と同期する必要あり
 * - 変更時は両方を更新すること
 */
export type ItemStatus =
    | "新品、未使用"
    | "未使用に近い"
    | "目立った傷や汚れなし"
    | "やや傷や汚れあり"
    | "傷や汚れあり"
    | "全体的に状態が悪い";

// ============================================================================
// 商品画像型（DBスキーマ対応）
// ============================================================================
/**
 * 商品画像データ型
 *
 * Why この型を分離するのか:
 * - 1商品に対して複数の画像を紐付け可能にする
 * - 画像の並び順とメイン画像の管理を型安全に行う
 *
 * DB設計の意図:
 * - item_id: 商品との紐付け（外部キー）
 * - sort_order: 画像の表示順序
 * - is_main: メイン画像フラグ（検索結果などで使用）
 */
export interface ItemImage {
    /** UUID v4形式。Supabaseが自動生成 */
    id: string;

    /** 紐付く商品のID */
    item_id: string;

    /** Supabase Storageの公開URL */
    image_url: string;

    /** 表示順序（0始まり） */
    sort_order: number;

    /** メイン画像フラグ */
    is_main: boolean;

    /** 作成日時（ISO 8601形式） */
    created_at: string;
}

// ============================================================================
// 商品型（DBスキーマ対応）
// ============================================================================
/**
 * 商品データ型
 *
 * Why この構造か:
 * - Supabaseの`items`テーブルのスキーマに1:1対応
 * - フロントエンドで扱いやすい形に正規化済み
 *
 * DB設計の意図:
 * - user_id: 認証済みユーザーとの紐付け（RLS対応）
 * - image_url: Supabase Storageの公開URL（メイン画像、後方互換性のため残す）
 * - images: 複数画像対応（item_imagesテーブルから取得）
 * - tags: PostgreSQLのARRAY型を使用（正規化より検索性を優先）
 *
 * Learning:
 * - Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
 */
export interface Item {
    /** UUID v4形式。Supabaseが自動生成 */
    id: string;

    /** 商品を登録したユーザーのID。RLSポリシーで使用 */
    user_id?: string;

    /** Supabase Storageの公開URL（メイン画像、後方互換性のため残す） */
    image_url: string;

    /** 複数画像配列（item_imagesテーブルから取得） */
    images?: ItemImage[];

    /** 商品タイトル（最大40文字） */
    title: string;

    /** 商品説明文 */
    description: string;

    /** 価格（300円〜9,999,999円） */
    price: number;

    /**
     * 商品の状態
     */
    status: ItemStatus;

    /** カテゴリ（オプション） */
    category?: string;

    /** ハッシュタグ配列 */
    tags?: string[];

    /**
     * 処理ステータス（リアルタイム生成用）
     * - pending: 作成直後、処理待ち
     * - processing_text: テキスト生成中
     * - processing_images: 画像生成中
     * - completed: 全処理完了
     * - failed: 処理失敗
     */
    processing_status?: "pending" | "processing_text" | "processing_images" | "completed" | "failed";

    /** 作成日時（ISO 8601形式） */
    created_at: string;

    /** 更新日時（ISO 8601形式） */
    updated_at?: string;
}

// ============================================================================
// API レスポンス型
// ============================================================================
/**
 * /api/analyze のレスポンス型
 *
 * Why この型を定義するのか:
 * - フロントエンドとバックエンドの契約を明確化
 * - APIレスポンスの型安全を担保
 *
 * Note:
 * - このレスポンスはGemini AIの出力を正規化したもの
 * - lib/gemini.ts のZodスキーマと対応している
 */
export interface AnalyzeResponse {
    /** AI生成タイトル */
    title: string;

    /** AI生成説明文 */
    description: string;

    /** AI推定価格 */
    price: number;

    /** AI生成ハッシュタグ */
    tags: string[];

    /** 出品禁止物の疑いフラグ */
    prohibited: boolean;

    /** 禁止理由（prohibitedがtrueの場合のみ） */
    prohibitedReason: string;
}

/**
 * /api/edit-image のレスポンス型
 *
 * Why successフラグを使うのか:
 * - 画像編集は失敗してもアプリ全体は動作可能
 * - 呼び出し元で成功/失敗を判断し、フォールバック処理が可能
 */
export interface EditImageResponse {
    /** 処理成功フラグ */
    success: boolean;

    /** 編集後の画像URL（Base64 Data URL形式） */
    imageUrl?: string;

    /** エラーメッセージ（失敗時のみ） */
    error?: string;
}

// ============================================================================
// フォーム状態
// ============================================================================
/**
 * 商品フォームの状態型
 *
 * Why Item型と別に定義するのか:
 * - フォームはDBの全フィールドを必要としない
 * - id, user_id, created_at などはフォーム入力不要
 * - 関心の分離: フォーム状態とDB状態は異なる概念
 *
 * Learning:
 * - React Hook Form: https://react-hook-form.com/
 * - 今回は useState で管理しているが、複雑化したら移行を検討
 */
export interface ItemFormState {
    /** 商品タイトル */
    title: string;

    /** 商品説明文 */
    description: string;

    /** 価格 */
    price: number;

    /**
     * 商品の状態
     *
     * Why ItemStatus | "" なのか:
     * - フォーム初期状態では未選択（空文字）を許可する必要がある
     * - Item型のstatusは必須だが、フォーム入力中は未確定の状態がある
     * - 保存時にバリデーションで空文字を弾く
     */
    status: ItemStatus | "";
}
