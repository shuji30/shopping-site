// メール本文のテンプレート（純粋ロジック / 外部依存なし）。
// 実送信の有無に関わらず件名・本文を組み立てるだけなので単体テストしやすい。

import { formatJP, rentalEndDate } from "./date";

export interface MailContent {
  subject: string;
  body: string;
}

export interface ConfirmationInput {
  orderNumber: string;
  name: string;
  method: "delivery" | "store";
  total: number;
  items: {
    name: string;
    size: string;
    startDate: string;
    rentalDays: number;
    price: number;
  }[];
}

/** 予約受付の確認メール */
export function reservationConfirmationEmail(
  r: ConfirmationInput,
): MailContent {
  const subject = `【きものレンタル 雅】ご予約を受け付けました（${r.orderNumber}）`;

  const itemLines = r.items
    .map((i) => {
      const end = rentalEndDate(i.startDate, i.rentalDays);
      return `・${i.name}（${i.size} / ${formatJP(i.startDate)}〜${formatJP(end)}） ¥${i.price.toLocaleString()}`;
    })
    .join("\n");

  const body = [
    `${r.name} 様`,
    "",
    "この度はきものレンタル 雅をご利用いただき、誠にありがとうございます。",
    "以下の内容でご予約を受け付けました。",
    "",
    `受付番号: ${r.orderNumber}`,
    `受取方法: ${r.method === "delivery" ? "配送" : "店頭受取"}`,
    "",
    "【ご注文内容】",
    itemLines,
    "",
    `合計金額: ¥${r.total.toLocaleString()}`,
    "",
    "受付番号とメールアドレスで、予約照会ページからいつでも内容の確認とオンライン決済ができます。",
    "",
    "※ 本メールはサンプルサイトの自動送信です（実際の送信は行われません）。",
  ].join("\n");

  return { subject, body };
}
