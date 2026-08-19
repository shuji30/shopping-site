"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { isPaymentStatus } from "@/lib/payment";

// 管理画面から入金ステータスを手動更新する（未入金/支払い済み/返金済みの切替）。
// /admin 配下から呼ばれ、middleware の Basic 認証で保護される。
export async function updatePaymentStatus(id: string, paymentStatus: string) {
  if (!isPaymentStatus(paymentStatus)) {
    return { ok: false, error: "不正な入金ステータスです。" };
  }
  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "予約が見つかりません。" };
  }
  await prisma.reservation.update({ where: { id }, data: { paymentStatus } });

  // 管理画面・お客様向けの表示（マイページ・予約照会）を更新
  revalidatePath(`/admin/reservations/${id}`);
  revalidatePath("/admin/reservations");
  revalidatePath("/admin");
  revalidatePath("/mypage");
  revalidatePath("/orders");
  return { ok: true };
}
