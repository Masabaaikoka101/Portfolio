/**
 * ユーティリティ関数
 *
 * このファイルの役割:
 * - プロジェクト全体で使用する汎用関数を集約
 *
 * Note:
 * - cn関数はshadcn/uiの標準パターン
 * - 将来的に他のユーティリティを追加する場合はここに集約
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * クラス名を結合するユーティリティ関数
 *
 * Why clsx + tailwind-merge の組み合わせか:
 * - clsx: 条件付きクラス名を簡潔に記述できる
 * - tailwind-merge: Tailwindクラスの競合を解決する
 *   例: cn("px-2", "px-4") → "px-4"（後者が優先）
 *
 * Alternatives:
 * - classnames ライブラリのみ使う方法もあるが、
 *   Tailwindの競合解決ができないため tailwind-merge を併用
 *
 * Learning:
 * - clsx: https://github.com/lukeed/clsx
 * - tailwind-merge: https://github.com/dcastil/tailwind-merge
 * - shadcn/uiのベストプラクティス: https://ui.shadcn.com/docs/installation
 *
 * @example
 * // 基本的な使い方
 * cn("px-4", "py-2") // → "px-4 py-2"
 *
 * // 条件付きクラス
 * cn("base", isActive && "active") // → isActiveがtrueなら "base active"
 *
 * // Tailwindクラスの競合解決
 * cn("px-2", "px-4") // → "px-4"（後者が優先）
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
