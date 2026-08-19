// 予約申込フォームの入力検証（純粋ロジック）。
//
// クライアント（CheckoutView）とサーバーアクション（createReservation）の
// 両方から呼ぶ。片方だけを直すと「画面は通るのに保存で弾かれる」ような
// ズレが生まれるため、判定とメッセージはここ1か所に集約する。
// DOM にも Prisma にも依存しないので、そのまま単体テストできる。

export type ReceiveMethod = "delivery" | "store";

/** 検証対象のフィールド（note・kana は任意入力なので検証しない） */
export interface ReservationFormValues {
  name: string;
  email: string;
  tel: string;
  method: ReceiveMethod;
  address?: string;
}

export type ReservationField = "name" | "email" | "tel" | "address";

export type ReservationErrors = Partial<Record<ReservationField, string>>;

export function isReceiveMethod(v: string): v is ReceiveMethod {
  return v === "delivery" || v === "store";
}

/**
 * メールアドレスの形式チェック。RFC 準拠の完全な検証はしない
 * （実務上は送信して到達確認するのが確実なため）。ここでは
 * 「@ の前後があり、ドメインにドットがある」程度の取りこぼし防止に留める。
 */
export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

/**
 * 予約申込フォームを検証し、フィールドごとのエラーメッセージを返す。
 * エラーが無ければ空オブジェクト（`hasErrors` で判定する）。
 */
export function validateReservationForm(
  values: ReservationFormValues,
): ReservationErrors {
  const errors: ReservationErrors = {};

  if (!values.name?.trim()) {
    errors.name = "お名前を入力してください。";
  }

  const email = values.email?.trim() ?? "";
  if (!email) {
    errors.email = "メールアドレスを入力してください。";
  } else if (!isValidEmail(email)) {
    errors.email = "メールアドレスの形式が正しくありません。";
  }

  if (!values.tel?.trim()) {
    errors.tel = "電話番号を入力してください。";
  }

  // 店頭受取のときは住所を求めない
  if (values.method === "delivery" && !values.address?.trim()) {
    errors.address = "配送先のご住所を入力してください。";
  }

  return errors;
}

export function hasErrors(errors: ReservationErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * サーバー側のようにフィールド単位で表示できない場所向けに、
 * 最初のエラーメッセージを1つだけ取り出す。順序は入力欄の並びに合わせる。
 */
export function firstErrorMessage(
  errors: ReservationErrors,
): string | undefined {
  const order: ReservationField[] = ["name", "email", "tel", "address"];
  for (const field of order) {
    const message = errors[field];
    if (message) return message;
  }
  return undefined;
}
