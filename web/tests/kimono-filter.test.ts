import { describe, it, expect } from "vitest";
import {
  filterKimonos,
  sortKimonos,
  applyKimonoQuery,
  isSortId,
  countPages,
  paginate,
  parsePage,
  pageWindow,
  PAGE_SIZE,
} from "@/lib/kimono-filter";
import type { Kimono } from "@/lib/types";

function k(partial: Partial<Kimono> & { id: string; price: number }): Kimono {
  return {
    name: "",
    category: "furisode",
    rentalDays: 3,
    sizes: ["M"],
    colors: [],
    images: [],
    material: "",
    description: "",
    inStock: true,
    featured: false,
    ...partial,
  };
}

const items: Kimono[] = [
  k({ id: "a", price: 30000, name: "振袖 花", colors: ["赤"], material: "正絹", description: "華やか" }),
  k({ id: "b", price: 6000, name: "浴衣 涼", colors: ["青"], material: "綿", description: "夏に" }),
  k({ id: "c", price: 18000, name: "訪問着 雅", colors: ["紺"], material: "正絹", description: "上品" }),
];

describe("filterKimonos", () => {
  it("空文字は全件返す", () => {
    expect(filterKimonos(items, "").length).toBe(3);
    expect(filterKimonos(items, "   ").length).toBe(3);
  });
  it("名前で部分一致", () => {
    expect(filterKimonos(items, "浴衣").map((x) => x.id)).toEqual(["b"]);
  });
  it("色・素材でも一致", () => {
    expect(filterKimonos(items, "正絹").map((x) => x.id).sort()).toEqual(["a", "c"]);
    expect(filterKimonos(items, "青").map((x) => x.id)).toEqual(["b"]);
  });
  it("該当なしは空配列", () => {
    expect(filterKimonos(items, "存在しない").length).toBe(0);
  });
});

describe("sortKimonos", () => {
  it("price-asc は安い順", () => {
    expect(sortKimonos(items, "price-asc").map((x) => x.id)).toEqual(["b", "c", "a"]);
  });
  it("price-desc は高い順", () => {
    expect(sortKimonos(items, "price-desc").map((x) => x.id)).toEqual(["a", "c", "b"]);
  });
  it("recommended / 未知は元の順を維持", () => {
    expect(sortKimonos(items, "recommended").map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(sortKimonos(items, "foo").map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
  it("元配列を破壊しない", () => {
    sortKimonos(items, "price-asc");
    expect(items.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
});

describe("applyKimonoQuery", () => {
  it("検索と並び替えを同時適用", () => {
    const res = applyKimonoQuery(items, { q: "正絹", sort: "price-asc" });
    expect(res.map((x) => x.id)).toEqual(["c", "a"]);
  });
});

describe("isSortId", () => {
  it("既知の並び順を判定", () => {
    expect(isSortId("price-asc")).toBe(true);
    expect(isSortId("recommended")).toBe(true);
    expect(isSortId("bogus")).toBe(false);
  });
});

describe("countPages", () => {
  it("端数は切り上げ、0件でも1ページ", () => {
    expect(countPages(0)).toBe(1);
    expect(countPages(1)).toBe(1);
    expect(countPages(PAGE_SIZE)).toBe(1);
    expect(countPages(PAGE_SIZE + 1)).toBe(2);
    expect(countPages(20, 8)).toBe(3);
  });
});

describe("parsePage", () => {
  it("未指定・数値でない値は1", () => {
    expect(parsePage(undefined, 3)).toBe(1);
    expect(parsePage("", 3)).toBe(1);
    expect(parsePage("abc", 3)).toBe(1);
  });
  it("範囲外は丸める", () => {
    expect(parsePage("0", 3)).toBe(1);
    expect(parsePage("-2", 3)).toBe(1);
    expect(parsePage("99", 3)).toBe(3);
  });
  it("範囲内はそのまま", () => {
    expect(parsePage("2", 3)).toBe(2);
  });
});

describe("paginate", () => {
  const many = Array.from({ length: 10 }, (_, i) => i + 1);

  it("1ページ目は先頭 PAGE_SIZE 件", () => {
    const r = paginate(many, 1);
    expect(r.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(r).toMatchObject({ page: 1, totalPages: 2, total: 10 });
  });

  it("最終ページは残りだけ", () => {
    expect(paginate(many, 2).items).toEqual([9, 10]);
  });

  it("範囲外のページは丸めて返す", () => {
    expect(paginate(many, 99).page).toBe(2);
    expect(paginate(many, 0).page).toBe(1);
  });

  it("0件でも壊れない", () => {
    expect(paginate([], 1)).toEqual({ items: [], page: 1, totalPages: 1, total: 0 });
  });

  it("元の配列を変更しない", () => {
    const src = [...many];
    paginate(src, 2);
    expect(src).toEqual(many);
  });
});

describe("pageWindow", () => {
  it("総ページ数が最大表示数以下なら全ページ", () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
  });
  it("現在ページを中心に最大5個", () => {
    expect(pageWindow(5, 10)).toEqual([3, 4, 5, 6, 7]);
  });
  it("端では反対側へ寄せて個数を保つ", () => {
    expect(pageWindow(1, 10)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(10, 10)).toEqual([6, 7, 8, 9, 10]);
  });
});
