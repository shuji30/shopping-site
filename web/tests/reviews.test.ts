import { describe, it, expect } from "vitest";
import { isValidRating, averageRating } from "@/lib/reviews";

describe("isValidRating", () => {
  it("1〜5の整数は有効", () => {
    expect(isValidRating(1)).toBe(true);
    expect(isValidRating(5)).toBe(true);
    expect(isValidRating(3)).toBe(true);
  });
  it("範囲外・非整数・NaN は無効", () => {
    expect(isValidRating(0)).toBe(false);
    expect(isValidRating(6)).toBe(false);
    expect(isValidRating(3.5)).toBe(false);
    expect(isValidRating(NaN)).toBe(false);
  });
});

describe("averageRating", () => {
  it("空配列は 0", () => {
    expect(averageRating([])).toBe(0);
  });
  it("平均を小数第1位に丸める", () => {
    expect(averageRating([5, 4])).toBe(4.5);
    expect(averageRating([5, 4, 4])).toBe(4.3); // 13/3=4.333
    expect(averageRating([1, 2, 2])).toBe(1.7); // 5/3=1.666
  });
  it("無効値は無視して集計", () => {
    expect(averageRating([5, 6, 0, 4])).toBe(4.5); // 6,0 を無視 → (5+4)/2
    expect(averageRating([3.5, 3])).toBe(3); // 3.5 を無視
  });
});
