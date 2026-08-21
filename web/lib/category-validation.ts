// カテゴリマスタの入力検証（純粋ロジック）。
// 管理画面のフォームとサーバーアクションの両方から呼ぶ。
// 予約フォーム（lib/reservation-validation.ts）と同じ方針で、判定と文言を1か所に集約する。

export interface CategoryInput {
  id: string;
  label: string;
  description: string;
  /** フォームからは文字列で来るので、数値でない場合も検証する */
  sortOrder: string | number;
}

export type CategoryField = "id" | "label" | "description" | "sortOrder";

export type CategoryErrors = Partial<Record<CategoryField, string>>;

/** 識別子に使える文字。URL のクエリに出るので半角小文字・数字・ハイフンに限る */
export const CATEGORY_ID_PATTERN = /^[a-z0-9-]+$/;

export const CATEGORY_ID_MAX = 32;
export const CATEGORY_LABEL_MAX = 20;
export const CATEGORY_DESCRIPTION_MAX = 120;

export function isValidCategoryId(v: string): boolean {
  const id = v.trim();
  return (
    id.length > 0 && id.length <= CATEGORY_ID_MAX && CATEGORY_ID_PATTERN.test(id)
  );
}

/**
 * 入力を検証する。
 * `mode: "create"` のときだけ識別子を検証する（変更時は識別子を変えられない仕様。
 * 既存商品の `category` 列や、外部に共有された絞り込みURLが壊れるため）。
 */
export function validateCategory(
  input: CategoryInput,
  mode: "create" | "update" = "create",
): CategoryErrors {
  const errors: CategoryErrors = {};

  if (mode === "create") {
    const id = input.id?.trim() ?? "";
    if (!id) {
      errors.id = "識別子を入力してください。";
    } else if (id.length > CATEGORY_ID_MAX) {
      errors.id = `識別子は${CATEGORY_ID_MAX}文字以内で入力してください。`;
    } else if (!CATEGORY_ID_PATTERN.test(id)) {
      errors.id = "識別子は半角の小文字・数字・ハイフンのみ使えます。";
    }
  }

  const label = input.label?.trim() ?? "";
  if (!label) {
    errors.label = "表示名を入力してください。";
  } else if (label.length > CATEGORY_LABEL_MAX) {
    errors.label = `表示名は${CATEGORY_LABEL_MAX}文字以内で入力してください。`;
  }

  const description = input.description?.trim() ?? "";
  if (!description) {
    errors.description = "説明を入力してください。";
  } else if (description.length > CATEGORY_DESCRIPTION_MAX) {
    errors.description = `説明は${CATEGORY_DESCRIPTION_MAX}文字以内で入力してください。`;
  }

  const sortOrder = parseSortOrder(input.sortOrder);
  if (sortOrder === null) {
    errors.sortOrder = "表示順は0以上の整数で入力してください。";
  }

  return errors;
}

/** フォームの文字列を表示順の数値へ。不正なら null */
export function parseSortOrder(v: string | number): number | null {
  if (typeof v === "number") {
    return Number.isInteger(v) && v >= 0 ? v : null;
  }
  const trimmed = v?.trim() ?? "";
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(n) ? n : null;
}

export function hasCategoryErrors(errors: CategoryErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** フィールド単位で表示できない場所向けに、最初のエラーを1つ返す */
export function firstCategoryError(
  errors: CategoryErrors,
): string | undefined {
  const order: CategoryField[] = ["id", "label", "description", "sortOrder"];
  for (const field of order) {
    if (errors[field]) return errors[field];
  }
  return undefined;
}
