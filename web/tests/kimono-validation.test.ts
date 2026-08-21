import { describe, it, expect } from "vitest";
import {
  firstKimonoError,
  formatList,
  hasKimonoErrors,
  isValidKimonoId,
  parseList,
  parsePositiveInt,
  validateKimono,
  KIMONO_DESCRIPTION_MAX,
  KIMONO_PRICE_MAX,
  KIMONO_RENTAL_DAYS_MAX,
  type KimonoInput,
} from "@/lib/kimono-validation";

/** 全項目が妥当な入力。各テストで壊したい項目だけ上書きする */
function valid(overrides: Partial<KimonoInput> = {}): KimonoInput {
  return {
    id: "furisode-sakura",
    name: "振袖 桜",
    category: "furisode",
    price: "28000",
    rentalDays: "3",
    sizes: "S, M, L",
    colors: "赤, 金",
    images: "furisode-sakura-1",
    material: "正絹",
    description: "桜をあしらった振袖です。",
    inStock: true,
    featured: false,
    ...overrides,
  };
}

describe("isValidKimonoId", () => {
  it("半角小文字・数字・ハイフンを受理する", () => {
    expect(isValidKimonoId("furisode-01")).toBe(true);
  });
  it("大文字・日本語・空白・空文字を拒否する", () => {
    expect(isValidKimonoId("Furisode")).toBe(false);
    expect(isValidKimonoId("振袖")).toBe(false);
    expect(isValidKimonoId("a b")).toBe(false);
    expect(isValidKimonoId("")).toBe(false);
  });
});

describe("parseList", () => {
  it("カンマ区切りを配列にする", () => {
    expect(parseList("S, M, L")).toEqual(["S", "M", "L"]);
  });
  it("全角カンマ・読点・中黒・空白も区切りとして扱う", () => {
    expect(parseList("赤，金、銀・白 黒")).toEqual([
      "赤",
      "金",
      "銀",
      "白",
      "黒",
    ]);
  });
  it("空要素を落とす", () => {
    expect(parseList(" , S ,, M , ")).toEqual(["S", "M"]);
  });
  it("重複を落として順序は保つ", () => {
    expect(parseList("M, S, M, L, S")).toEqual(["M", "S", "L"]);
  });
  it("空文字は空配列", () => {
    expect(parseList("")).toEqual([]);
    expect(parseList("   ")).toEqual([]);
  });
});

describe("formatList", () => {
  it("カンマ区切りに戻す（parseList と往復できる）", () => {
    const src = "S, M, L";
    expect(formatList(parseList(src))).toBe(src);
  });
  it("空配列は空文字", () => {
    expect(formatList([])).toBe("");
  });
});

describe("parsePositiveInt", () => {
  it("正の整数を受理する", () => {
    expect(parsePositiveInt("28000")).toBe(28000);
    expect(parsePositiveInt(3)).toBe(3);
  });
  it("桁区切りのカンマを許す", () => {
    expect(parsePositiveInt("28,000")).toBe(28000);
  });
  it("0・負数・小数・非数値は null", () => {
    expect(parsePositiveInt("0")).toBeNull();
    expect(parsePositiveInt("-1")).toBeNull();
    expect(parsePositiveInt("1.5")).toBeNull();
    expect(parsePositiveInt("abc")).toBeNull();
    expect(parsePositiveInt("")).toBeNull();
  });
});

describe("validateKimono", () => {
  it("妥当な入力ではエラーが無い", () => {
    const errors = validateKimono(valid());
    expect(errors).toEqual({});
    expect(hasKimonoErrors(errors)).toBe(false);
  });

  it("識別子は create のときだけ検証する", () => {
    expect(validateKimono(valid({ id: "NG_大文字" }), "create").id).toBeTruthy();
    // update では識別子を変更できない仕様なので検証対象外
    expect(validateKimono(valid({ id: "NG_大文字" }), "update").id).toBeUndefined();
  });

  it("商品名・素材・説明・カテゴリは必須", () => {
    expect(validateKimono(valid({ name: "  " })).name).toBeTruthy();
    expect(validateKimono(valid({ material: "" })).material).toBeTruthy();
    expect(validateKimono(valid({ description: "" })).description).toBeTruthy();
    expect(validateKimono(valid({ category: "" })).category).toBeTruthy();
  });

  it("説明が上限を超えると弾く", () => {
    const long = "あ".repeat(KIMONO_DESCRIPTION_MAX + 1);
    expect(validateKimono(valid({ description: long })).description).toBeTruthy();
  });

  it("レンタル料は1以上かつ上限以下", () => {
    expect(validateKimono(valid({ price: "0" })).price).toBeTruthy();
    expect(validateKimono(valid({ price: "abc" })).price).toBeTruthy();
    expect(
      validateKimono(valid({ price: String(KIMONO_PRICE_MAX + 1) })).price,
    ).toBeTruthy();
    expect(
      validateKimono(valid({ price: String(KIMONO_PRICE_MAX) })).price,
    ).toBeUndefined();
  });

  it("レンタル日数は1以上かつ上限以下", () => {
    expect(validateKimono(valid({ rentalDays: "0" })).rentalDays).toBeTruthy();
    expect(
      validateKimono(valid({ rentalDays: String(KIMONO_RENTAL_DAYS_MAX + 1) }))
        .rentalDays,
    ).toBeTruthy();
  });

  it("サイズ・色・画像はそれぞれ1つ以上必要", () => {
    expect(validateKimono(valid({ sizes: "" })).sizes).toBeTruthy();
    expect(validateKimono(valid({ colors: " , " })).colors).toBeTruthy();
    expect(validateKimono(valid({ images: "" })).images).toBeTruthy();
  });

  it("在庫・注目フラグは検証対象外（どちらでも通る）", () => {
    expect(hasKimonoErrors(validateKimono(valid({ inStock: false })))).toBe(false);
    expect(hasKimonoErrors(validateKimono(valid({ featured: true })))).toBe(false);
  });

  it("複数の不備をまとめて返す", () => {
    const errors = validateKimono(
      valid({ name: "", price: "0", sizes: "", material: "" }),
    );
    expect(Object.keys(errors).sort()).toEqual([
      "material",
      "name",
      "price",
      "sizes",
    ]);
  });
});

describe("firstKimonoError", () => {
  it("入力欄の並び順で最初のエラーを返す", () => {
    const errors = validateKimono(valid({ name: "", price: "0" }));
    expect(firstKimonoError(errors)).toBe("商品名を入力してください。");
  });
  it("エラーが無ければ undefined", () => {
    expect(firstKimonoError({})).toBeUndefined();
  });
});
