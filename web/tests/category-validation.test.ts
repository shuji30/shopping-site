import { describe, it, expect } from "vitest";
import {
  CATEGORY_DESCRIPTION_MAX,
  CATEGORY_ID_MAX,
  CATEGORY_LABEL_MAX,
  firstCategoryError,
  hasCategoryErrors,
  isValidCategoryId,
  parseSortOrder,
  validateCategory,
  type CategoryInput,
} from "@/lib/category-validation";

function valid(overrides: Partial<CategoryInput> = {}): CategoryInput {
  return {
    id: "komon",
    label: "小紋",
    description: "普段着として気軽に楽しめる、繰り返し柄の着物。",
    sortOrder: "70",
    ...overrides,
  };
}

describe("isValidCategoryId", () => {
  it("半角小文字・数字・ハイフンを受理する", () => {
    expect(isValidCategoryId("komon")).toBe(true);
    expect(isValidCategoryId("furisode-2")).toBe(true);
  });
  it("大文字・日本語・空白・空文字を拒否する", () => {
    expect(isValidCategoryId("Komon")).toBe(false);
    expect(isValidCategoryId("小紋")).toBe(false);
    expect(isValidCategoryId("ko mon")).toBe(false);
    expect(isValidCategoryId("")).toBe(false);
    expect(isValidCategoryId("   ")).toBe(false);
  });
  it("長すぎる識別子を拒否する", () => {
    expect(isValidCategoryId("a".repeat(CATEGORY_ID_MAX))).toBe(true);
    expect(isValidCategoryId("a".repeat(CATEGORY_ID_MAX + 1))).toBe(false);
  });
});

describe("parseSortOrder", () => {
  it("0以上の整数文字列を数値にする", () => {
    expect(parseSortOrder("0")).toBe(0);
    expect(parseSortOrder(" 30 ")).toBe(30);
  });
  it("数値もそのまま扱う", () => {
    expect(parseSortOrder(40)).toBe(40);
  });
  it("負数・小数・数値でない文字列は null", () => {
    expect(parseSortOrder("-1")).toBeNull();
    expect(parseSortOrder("1.5")).toBeNull();
    expect(parseSortOrder("abc")).toBeNull();
    expect(parseSortOrder("")).toBeNull();
    expect(parseSortOrder(-1)).toBeNull();
    expect(parseSortOrder(1.5)).toBeNull();
  });
});

describe("validateCategory（新規）", () => {
  it("妥当な入力ではエラーが無い", () => {
    const errors = validateCategory(valid());
    expect(errors).toEqual({});
    expect(hasCategoryErrors(errors)).toBe(false);
  });

  it("識別子の不備を検出する", () => {
    expect(validateCategory(valid({ id: "" })).id).toBe(
      "識別子を入力してください。",
    );
    expect(validateCategory(valid({ id: "小紋" })).id).toBe(
      "識別子は半角の小文字・数字・ハイフンのみ使えます。",
    );
    expect(
      validateCategory(valid({ id: "a".repeat(CATEGORY_ID_MAX + 1) })).id,
    ).toContain(`${CATEGORY_ID_MAX}文字以内`);
  });

  it("表示名は必須・上限あり", () => {
    expect(validateCategory(valid({ label: "  " })).label).toBe(
      "表示名を入力してください。",
    );
    expect(
      validateCategory(valid({ label: "あ".repeat(CATEGORY_LABEL_MAX + 1) }))
        .label,
    ).toContain(`${CATEGORY_LABEL_MAX}文字以内`);
  });

  it("説明は必須・上限あり", () => {
    expect(validateCategory(valid({ description: "" })).description).toBe(
      "説明を入力してください。",
    );
    expect(
      validateCategory(
        valid({ description: "あ".repeat(CATEGORY_DESCRIPTION_MAX + 1) }),
      ).description,
    ).toContain(`${CATEGORY_DESCRIPTION_MAX}文字以内`);
  });

  it("表示順が不正なら弾く", () => {
    expect(validateCategory(valid({ sortOrder: "-5" })).sortOrder).toBe(
      "表示順は0以上の整数で入力してください。",
    );
  });
});

describe("validateCategory（変更）", () => {
  it("識別子は検証しない（変更できない仕様のため）", () => {
    const errors = validateCategory(valid({ id: "不正なID" }), "update");
    expect(errors.id).toBeUndefined();
    expect(hasCategoryErrors(errors)).toBe(false);
  });

  it("表示名などは変更時も検証する", () => {
    expect(validateCategory(valid({ label: "" }), "update").label).toBeTruthy();
  });
});

describe("firstCategoryError", () => {
  it("入力欄の並び順で最初のエラーを返す", () => {
    const errors = validateCategory({
      id: "",
      label: "",
      description: "",
      sortOrder: "x",
    });
    expect(firstCategoryError(errors)).toBe("識別子を入力してください。");
  });
  it("エラーが無ければ undefined", () => {
    expect(firstCategoryError({})).toBeUndefined();
  });
});
