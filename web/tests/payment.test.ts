import { describe, it, expect } from "vitest";
import {
  isPaymentStatus,
  paymentStatusLabel,
  paymentStatusLabels,
  processPayment,
} from "@/lib/payment";

describe("isPaymentStatus", () => {
  it("既知のステータスを受理する", () => {
    expect(isPaymentStatus("unpaid")).toBe(true);
    expect(isPaymentStatus("paid")).toBe(true);
    expect(isPaymentStatus("refunded")).toBe(true);
  });

  it("未知の値を拒否する", () => {
    expect(isPaymentStatus("cancelled")).toBe(false);
    expect(isPaymentStatus("")).toBe(false);
  });
});

describe("paymentStatusLabel", () => {
  it("既知ステータスは日本語ラベルを返す", () => {
    expect(paymentStatusLabel("unpaid")).toBe("未払い");
    expect(paymentStatusLabel("paid")).toBe("支払い済み");
    expect(paymentStatusLabel("refunded")).toBe("返金済み");
  });

  it("未知の値はそのまま返す", () => {
    expect(paymentStatusLabel("foo")).toBe("foo");
  });

  it("全ステータスにラベルがある", () => {
    for (const key of Object.keys(paymentStatusLabels)) {
      expect(paymentStatusLabels[key as keyof typeof paymentStatusLabels]).toBeTruthy();
    }
  });
});

describe("processPayment（テストモードのモック）", () => {
  it("正の金額なら成功し、決定的な取引IDを返す", () => {
    const a = processPayment({ orderNumber: "MYB-1", amount: 12000 });
    const b = processPayment({ orderNumber: "MYB-1", amount: 12000 });
    expect(a.ok).toBe(true);
    expect(a.transactionId).toBe("TEST-MYB-1-12000");
    // 同じ入力なら同じID（冪等・再現可能）
    expect(a.transactionId).toBe(b.transactionId);
  });

  it("金額が0以下なら失敗する", () => {
    expect(processPayment({ orderNumber: "MYB-1", amount: 0 }).ok).toBe(false);
    expect(processPayment({ orderNumber: "MYB-1", amount: -100 }).ok).toBe(false);
  });

  it("金額が数値でないなら失敗する", () => {
    expect(processPayment({ orderNumber: "MYB-1", amount: NaN }).ok).toBe(false);
  });

  it("受付番号が空なら失敗する", () => {
    expect(processPayment({ orderNumber: "", amount: 1000 }).ok).toBe(false);
    expect(processPayment({ orderNumber: "   ", amount: 1000 }).ok).toBe(false);
  });
});
