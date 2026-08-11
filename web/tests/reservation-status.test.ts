import { describe, it, expect } from "vitest";
import {
  statusLabel,
  isReservationStatus,
  statusLabels,
} from "@/lib/reservation-status";

describe("isReservationStatus", () => {
  it("既知の値は true", () => {
    expect(isReservationStatus("reserved")).toBe(true);
    expect(isReservationStatus("shipped")).toBe(true);
    expect(isReservationStatus("returned")).toBe(true);
    expect(isReservationStatus("cancelled")).toBe(true);
  });
  it("未知の値は false", () => {
    expect(isReservationStatus("unknown")).toBe(false);
    expect(isReservationStatus("")).toBe(false);
  });
});

describe("statusLabel", () => {
  it("既知の値は日本語ラベル", () => {
    expect(statusLabel("reserved")).toBe("受付");
    expect(statusLabel("shipped")).toBe("発送済み");
  });
  it("未知の値はそのまま返す", () => {
    expect(statusLabel("weird")).toBe("weird");
  });
  it("全ステータスにラベルがある", () => {
    for (const key of Object.keys(statusLabels)) {
      expect(statusLabels[key as keyof typeof statusLabels]).toBeTruthy();
    }
  });
});
