import { describe, it, expect } from "vitest";
import {
  addDays,
  rentalEndDate,
  latestReturnDate,
  formatJP,
  rangesOverlap,
} from "@/lib/date";

describe("addDays", () => {
  it("日付を加算する", () => {
    expect(addDays("2026-01-01", 1)).toBe("2026-01-02");
  });
  it("月をまたぐ", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  });
  it("年をまたぐ", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("うるう年の2月をまたぐ", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("rentalEndDate", () => {
  it("3日レンタルは開始日＋2日が終了日", () => {
    expect(rentalEndDate("2026-05-01", 3)).toBe("2026-05-03");
  });
  it("1日レンタルは開始日と同じ", () => {
    expect(rentalEndDate("2026-05-01", 1)).toBe("2026-05-01");
  });
});

describe("latestReturnDate", () => {
  it("明細が無ければ null", () => {
    expect(latestReturnDate([])).toBeNull();
  });
  it("最も遅い返却日を返す", () => {
    const items = [
      { startDate: "2026-05-01", rentalDays: 3 }, // 〜05-03
      { startDate: "2026-05-10", rentalDays: 2 }, // 〜05-11
      { startDate: "2026-04-20", rentalDays: 5 }, // 〜04-24
    ];
    expect(latestReturnDate(items)).toBe("2026-05-11");
  });
});

describe("formatJP", () => {
  it("ハイフンをスラッシュに", () => {
    expect(formatJP("2026-08-11")).toBe("2026/08/11");
  });
});

describe("rangesOverlap", () => {
  it("重なる場合 true", () => {
    expect(rangesOverlap("2026-01-01", "2026-01-05", "2026-01-04", "2026-01-08")).toBe(true);
  });
  it("完全に含む場合 true", () => {
    expect(rangesOverlap("2026-01-01", "2026-01-31", "2026-01-10", "2026-01-12")).toBe(true);
  });
  it("端が接する場合 true（両端含む）", () => {
    expect(rangesOverlap("2026-01-01", "2026-01-05", "2026-01-05", "2026-01-09")).toBe(true);
  });
  it("離れている場合 false", () => {
    expect(rangesOverlap("2026-01-01", "2026-01-05", "2026-01-06", "2026-01-09")).toBe(false);
  });
});
