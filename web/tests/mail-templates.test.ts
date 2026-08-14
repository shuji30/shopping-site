import { describe, it, expect } from "vitest";
import { reservationConfirmationEmail } from "@/lib/mail-templates";

const input = {
  orderNumber: "MYB-20260814-1234",
  name: "山田花子",
  method: "delivery" as const,
  total: 46000,
  items: [
    { name: "振袖 花簪", size: "M", startDate: "2026-09-20", rentalDays: 3, price: 28000 },
    { name: "訪問着 四季彩", size: "L", startDate: "2026-10-01", rentalDays: 4, price: 18000 },
  ],
};

describe("reservationConfirmationEmail", () => {
  const mail = reservationConfirmationEmail(input);

  it("件名に受付番号を含む", () => {
    expect(mail.subject).toContain("MYB-20260814-1234");
  });
  it("本文に宛名・受付番号・受取方法・合計を含む", () => {
    expect(mail.body).toContain("山田花子 様");
    expect(mail.body).toContain("MYB-20260814-1234");
    expect(mail.body).toContain("配送");
    expect(mail.body).toContain("¥46,000");
  });
  it("本文に各明細（商品名・料金）を含む", () => {
    expect(mail.body).toContain("振袖 花簪");
    expect(mail.body).toContain("訪問着 四季彩");
    expect(mail.body).toContain("¥28,000");
    expect(mail.body).toContain("¥18,000");
  });
  it("店頭受取なら受取方法が店頭受取になる", () => {
    const m = reservationConfirmationEmail({ ...input, method: "store" });
    expect(m.body).toContain("店頭受取");
  });
});
