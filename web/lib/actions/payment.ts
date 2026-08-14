"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { processPayment } from "@/lib/payment";

export interface PayResult {
  ok: boolean;
  /** すでに支払い済みだった場合 true（この呼び出しでは決済していない） */
  alreadyPaid?: boolean;
  paymentStatus?: string;
  error?: string;
}

/**
 * 予約のオンライン決済（テストモード）。
 *
 * 予約照会と同様に、受付番号とメールアドレスの**両方**が一致した場合のみ処理する
 * （他人の予約を勝手に決済できないようにする）。金額はクライアント値を信用せず
 * DB の total を用いる。冪等：すでに paid の場合は再課金せず alreadyPaid を返す。
 */
export async function payReservation(input: {
  orderNumber: string;
  email: string;
}): Promise<PayResult> {
  const orderNumber = input.orderNumber?.trim();
  const email = input.email?.trim().toLowerCase();
  if (!orderNumber || !email) {
    return { ok: false, error: "受付番号とメールアドレスを入力してください。" };
  }

  const r = await prisma.reservation.findUnique({ where: { orderNumber } });
  if (!r || r.email.trim().toLowerCase() !== email) {
    return {
      ok: false,
      error: "該当する予約が見つかりませんでした。",
    };
  }

  if (r.paymentStatus === "paid") {
    return { ok: true, alreadyPaid: true, paymentStatus: "paid" };
  }

  const result = processPayment({ orderNumber: r.orderNumber, amount: r.total });
  if (!result.ok) {
    return { ok: false, error: result.error ?? "決済に失敗しました。" };
  }

  await prisma.reservation.update({
    where: { id: r.id },
    data: { paymentStatus: "paid" },
  });

  // 管理画面・予約照会の表示を更新
  revalidatePath("/admin/reservations");
  revalidatePath(`/admin/reservations/${r.id}`);
  revalidatePath("/orders");

  return { ok: true, paymentStatus: "paid" };
}
