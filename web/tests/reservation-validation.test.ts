import { describe, it, expect } from "vitest";
import {
  firstErrorMessage,
  hasErrors,
  isReceiveMethod,
  isValidEmail,
  validateReservationForm,
  type ReservationFormValues,
} from "@/lib/reservation-validation";

/** 全項目が妥当な入力。各テストで壊したい項目だけ上書きする */
function valid(
  overrides: Partial<ReservationFormValues> = {},
): ReservationFormValues {
  return {
    name: "山田 花子",
    email: "hanako@example.jp",
    tel: "090-1234-5678",
    method: "delivery",
    address: "東京都渋谷区1-2-3",
    ...overrides,
  };
}

describe("isReceiveMethod", () => {
  it("既知の受取方法を受理する", () => {
    expect(isReceiveMethod("delivery")).toBe(true);
    expect(isReceiveMethod("store")).toBe(true);
  });
  it("未知の値を拒否する", () => {
    expect(isReceiveMethod("pickup")).toBe(false);
    expect(isReceiveMethod("")).toBe(false);
  });
});

describe("isValidEmail", () => {
  it("一般的な形式を受理する", () => {
    expect(isValidEmail("a@b.jp")).toBe(true);
    expect(isValidEmail("hanako.yamada+tag@example.co.jp")).toBe(true);
  });
  it("前後の空白は無視する", () => {
    expect(isValidEmail("  a@b.jp  ")).toBe(true);
  });
  it("@ やドメインのドットが無いものを拒否する", () => {
    expect(isValidEmail("hanako")).toBe(false);
    expect(isValidEmail("hanako@example")).toBe(false);
    expect(isValidEmail("@example.jp")).toBe(false);
    expect(isValidEmail("hanako@ example.jp")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("validateReservationForm", () => {
  it("妥当な入力ではエラーが無い", () => {
    const errors = validateReservationForm(valid());
    expect(errors).toEqual({});
    expect(hasErrors(errors)).toBe(false);
  });

  it("お名前は必須（空白のみも不可）", () => {
    expect(validateReservationForm(valid({ name: "" })).name).toBe(
      "お名前を入力してください。",
    );
    expect(validateReservationForm(valid({ name: "   " })).name).toBeTruthy();
  });

  it("メールは未入力と形式不正でメッセージが変わる", () => {
    expect(validateReservationForm(valid({ email: "" })).email).toBe(
      "メールアドレスを入力してください。",
    );
    expect(validateReservationForm(valid({ email: "こわれた" })).email).toBe(
      "メールアドレスの形式が正しくありません。",
    );
  });

  it("電話番号は必須", () => {
    expect(validateReservationForm(valid({ tel: "" })).tel).toBe(
      "電話番号を入力してください。",
    );
  });

  it("配送のときは住所が必須", () => {
    expect(
      validateReservationForm(valid({ method: "delivery", address: "" }))
        .address,
    ).toBe("配送先のご住所を入力してください。");
  });

  it("店頭受取なら住所が空でもよい", () => {
    const errors = validateReservationForm(
      valid({ method: "store", address: "" }),
    );
    expect(errors.address).toBeUndefined();
    expect(hasErrors(errors)).toBe(false);
  });

  it("住所未指定（undefined）でも配送なら弾く", () => {
    const errors = validateReservationForm({
      name: "山田",
      email: "a@b.jp",
      tel: "090",
      method: "delivery",
    });
    expect(errors.address).toBeTruthy();
  });

  it("複数の不備をまとめて返す", () => {
    const errors = validateReservationForm({
      name: "",
      email: "",
      tel: "",
      method: "delivery",
      address: "",
    });
    expect(Object.keys(errors).sort()).toEqual([
      "address",
      "email",
      "name",
      "tel",
    ]);
  });
});

describe("firstErrorMessage", () => {
  it("入力欄の並び順で最初のエラーを返す", () => {
    const errors = validateReservationForm({
      name: "",
      email: "",
      tel: "",
      method: "delivery",
      address: "",
    });
    expect(firstErrorMessage(errors)).toBe("お名前を入力してください。");
  });

  it("先頭の項目が正しければ次の項目のエラーを返す", () => {
    const errors = validateReservationForm(valid({ tel: "" }));
    expect(firstErrorMessage(errors)).toBe("電話番号を入力してください。");
  });

  it("エラーが無ければ undefined", () => {
    expect(firstErrorMessage({})).toBeUndefined();
  });
});
