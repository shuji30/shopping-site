"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { processPayment } from "@/lib/payment";
import { getCurrentUser } from "@/lib/auth";

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

/**
 * ログイン中のユーザーが、自分の予約を予約IDで直接決済する（マイページ用）。
 * 受付番号+メールの代わりにセッションで本人確認する。他人の予約IDを渡しても
 * userId が一致しなければ拒否する。冪等：すでに paid なら再課金しない。
 */
export async function payMyReservation(
  reservationId: string,
): Promise<PayResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です。" };
  }

  const r = await prisma.reservation.findUnique({
    where: { id: reservationId },
  });
  if (!r || r.userId !== user.id) {
    return { ok: false, error: "該当する予約が見つかりませんでした。" };
  }

  if (r.paymentStatus === "paid") {
    return { ok: true, alreadyPaid: true, paymentStatus: "paid" };
  }
  if (r.status === "cancelled") {
    return { ok: false, error: "キャンセル済みの予約のため、お支払いできません。" };
  }

  const result = processPayment({ orderNumber: r.orderNumber, amount: r.total });
  if (!result.ok) {
    return { ok: false, error: result.error ?? "決済に失敗しました。" };
  }

  await prisma.reservation.update({
    where: { id: r.id },
    data: { paymentStatus: "paid" },
  });

  revalidatePath("/mypage");
  revalidatePath("/admin/reservations");
  revalidatePath(`/admin/reservations/${r.id}`);
  revalidatePath("/orders");

  return { ok: true, paymentStatus: "paid" };
}
