import { describe, it, expect } from "vitest";
import {
  findCategory,
  getCategoryLabel,
  nextSortOrder,
  sortCategories,
} from "@/lib/categories";
import { initialCategories } from "@/data/categories";
import type { KimonoCategory } from "@/lib/types";

function cat(
  id: string,
  label: string,
  sortOrder: number,
): KimonoCategory {
  return { id, label, description: `${label}の説明`, sortOrder };
}

describe("initialCategories（seed 用の初期データ）", () => {
  it("6種ある", () => {
    expect(initialCategories).toHaveLength(6);
  });
  it("ID は一意", () => {
    const ids = initialCategories.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("sortOrder も一意（並びが安定する）", () => {
    const orders = initialCategories.map((c) => c.sortOrder);
    expect(new Set(orders).size).toBe(orders.length);
  });
});

describe("findCategory / getCategoryLabel", () => {
  it("既知IDのラベルを返す", () => {
    expect(getCategoryLabel(initialCategories, "furisode")).toBe("振袖");
    expect(findCategory(initialCategories, "yukata")?.label).toBe("浴衣");
  });
  it("未知IDはIDをそのまま返す（空欄にしない）", () => {
    expect(getCategoryLabel(initialCategories, "nonexistent")).toBe(
      "nonexistent",
    );
    expect(findCategory(initialCategories, "nonexistent")).toBeUndefined();
  });
  it("空の配列でも落ちない", () => {
    expect(getCategoryLabel([], "furisode")).toBe("furisode");
  });
});

describe("sortCategories", () => {
  it("sortOrder の昇順に並べる", () => {
    const list = [cat("c", "C", 30), cat("a", "A", 10), cat("b", "B", 20)];
    expect(sortCategories(list).map((c) => c.id)).toEqual(["a", "b", "c"]);
  });
  it("sortOrder が同値なら ID 順", () => {
    const list = [cat("b", "B", 10), cat("a", "A", 10)];
    expect(sortCategories(list).map((c) => c.id)).toEqual(["a", "b"]);
  });
  it("元配列を変更しない", () => {
    const list = [cat("c", "C", 30), cat("a", "A", 10)];
    sortCategories(list);
    expect(list.map((c) => c.id)).toEqual(["c", "a"]);
  });
});

describe("nextSortOrder", () => {
  it("最大値 + 10（末尾に来る・後から間に挟める）", () => {
    expect(nextSortOrder([cat("a", "A", 10), cat("b", "B", 40)])).toBe(50);
  });
  it("空なら 10", () => {
    expect(nextSortOrder([])).toBe(10);
  });
});
