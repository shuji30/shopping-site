import { describe, it, expect } from "vitest";
import {
  categories,
  getCategory,
  getCategoryLabel,
} from "@/lib/categories";

describe("categories", () => {
  it("カテゴリが6種ある", () => {
    expect(categories).toHaveLength(6);
  });
  it("ID は一意", () => {
    const ids = categories.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getCategory / getCategoryLabel", () => {
  it("既知IDのラベルを返す", () => {
    expect(getCategoryLabel("furisode")).toBe("振袖");
    expect(getCategory("yukata")?.label).toBe("浴衣");
  });
  it("未知IDはIDをそのまま返す", () => {
    // @ts-expect-error 未知のカテゴリIDを検証
    expect(getCategoryLabel("nonexistent")).toBe("nonexistent");
  });
});
