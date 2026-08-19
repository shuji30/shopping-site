// オンライン決済のドメイン（純粋ロジック）と、差し替え可能なゲートウェイの継ぎ目。
//
// このプロジェクトは学習用サンプルのため、既定では「テストモード（モック）」の
// 決済ゲートウェイを使う。実運用では下記 processPayment を Stripe 等の
// 実 API 呼び出しに差し替える（PaymentIntent の作成・確定など）。UI や
// サーバーアクションはこのインターフェイス越しに呼ぶので、差し替え時に
// 呼び出し側を変更する必要はない。

export type PaymentStatus =
  | "unpaid" // 未払い
  | "paid" // 支払い済み
  | "refunded"; // 返金済み

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  unpaid: "未払い",
  paid: "支払い済み",
  refunded: "返金済み",
};

/** バッジ配色（Tailwind クラス） */
export const paymentStatusClasses: Record<PaymentStatus, string> = {
  unpaid: "bg-enji/10 text-enji",
  paid: "bg-emerald-100 text-emerald-700",
  refunded: "bg-sumi/10 text-sumi/70",
};

export function isPaymentStatus(v: string): v is PaymentStatus {
  return v === "unpaid" || v === "paid" || v === "refunded";
}

export function paymentStatusLabel(v: string): string {
  return isPaymentStatus(v) ? paymentStatusLabels[v] : v;
}

export interface PaymentRequest {
  orderNumber: string;
  amount: number;
}

export interface PaymentResult {
  ok: boolean;
  /** ゲートウェイ側の取引ID（成功時） */
  transactionId?: string;
  error?: string;
}

/**
 * テストモードのモック決済ゲートウェイ。
 * 金額が正なら常に成功し、擬似的な取引IDを返す。ネットワークや外部依存は無い。
 *
 * 取引IDは入力から決定的に生成する（ランダム値を使わない）ため、同じ申込に対する
 * 二重呼び出しでも同じIDになり、テスト・再現が容易。実ゲートウェイに差し替える際は
 * この関数の中身だけを置き換える。
 */
export function processPayment(req: PaymentRequest): PaymentResult {
  if (!req.orderNumber?.trim()) {
    return { ok: false, error: "受付番号がありません。" };
  }
  if (!Number.isFinite(req.amount) || req.amount <= 0) {
    return { ok: false, error: "金額が不正です。" };
  }
  return {
    ok: true,
    transactionId: `TEST-${req.orderNumber}-${req.amount}`,
  };
}
