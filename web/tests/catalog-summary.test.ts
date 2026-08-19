import { describe, it, expect } from "vitest";
import {
  fillCatalogNote,
  formatDaysRange,
  formatPriceRange,
  summarizeCatalog,
} from "@/lib/catalog-summary";

const items = [
  { price: 28000, rentalDays: 3 },
  { price: 6000, rentalDays: 2 },
  { price: 18000, rentalDays: 4 },
];

describe("summarizeCatalog", () => {
  it("件数と価格・日数の最小最大を返す", () => {
    expect(summarizeCatalog(items)).toEqual({
      count: 3,
      minPrice: 6000,
      maxPrice: 28000,
      minDays: 2,
      maxDays: 4,
    });
  });

  it("1件なら最小＝最大", () => {
    expect(summarizeCatalog([{ price: 9000, rentalDays: 3 }])).toEqual({
      count: 1,
      minPrice: 9000,
      maxPrice: 9000,
      minDays: 3,
      maxDays: 3,
    });
  });

  it("空配列は null（呼び出し側で非表示にする）", () => {
    expect(summarizeCatalog([])).toBeNull();
  });
});

describe("formatPriceRange", () => {
  it("桁区切りつきで範囲を出す", () => {
    expect(formatPriceRange(6000, 28000)).toBe("¥6,000〜¥28,000");
  });
  it("同額なら1つだけ", () => {
    expect(formatPriceRange(9000, 9000)).toBe("¥9,000");
  });
});

describe("formatDaysRange", () => {
  it("範囲を出す", () => {
    expect(formatDaysRange(2, 4)).toBe("2〜4日");
  });
  it("同じなら1つだけ", () => {
    expect(formatDaysRange(3, 3)).toBe("3日");
  });
});

describe("fillCatalogNote", () => {
  const summary = summarizeCatalog(items)!;

  it("プレースホルダを実データで埋める", () => {
    expect(
      fillCatalogNote(
        "現在 {count} 点を掲載中。レンタル料 {price}／{days} のご利用です。",
        summary,
      ),
    ).toBe("現在 3 点を掲載中。レンタル料 ¥6,000〜¥28,000／2〜4日 のご利用です。");
  });

  it("同じプレースホルダが複数あってもすべて埋める", () => {
    expect(fillCatalogNote("{count}点／{count}点", summary)).toBe("3点／3点");
  });

  it("プレースホルダが無ければそのまま返す", () => {
    expect(fillCatalogNote("固定の文言", summary)).toBe("固定の文言");
  });
});
