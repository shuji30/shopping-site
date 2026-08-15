import { describe, it, expect } from "vitest";
import {
  filterKimonos,
  sortKimonos,
  applyKimonoQuery,
  isSortId,
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
