"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { isReservationStatus } from "@/lib/reservation-status";

// 管理画面から予約ステータスを更新する。
// /admin 配下から呼ばれ、middleware の Basic 認証で保護される。
export async function updateReservationStatus(id: string, status: string) {
  if (!isReservationStatus(status)) {
    return { ok: false, error: "不正なステータスです。" };
  }
  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "予約が見つかりません。" };
  }
  await prisma.reservation.update({ where: { id }, data: { status } });

  revalidatePath(`/admin/reservations/${id}`);
  revalidatePath("/admin/reservations");
  revalidatePath("/admin");
  return { ok: true };
}
