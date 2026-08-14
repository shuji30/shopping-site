"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isCancellable } from "@/lib/reservation-status";

export interface CancelResult {
  ok: boolean;
  status?: string;
  error?: string;
}

function revalidateAfterCancel(id: string) {
  revalidatePath("/mypage");
  revalidatePath("/orders");
  revalidatePath("/admin/reservations");
  revalidatePath(`/admin/reservations/${id}`);
}

/**
 * ログイン中のユーザーが、自分の予約を予約IDでキャンセルする（マイページ用）。
 * セッションで本人確認し、受付（reserved）状態のときのみキャンセルできる。
 */
export async function cancelMyReservation(
  reservationId: string,
): Promise<CancelResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ログインが必要です。" };

  const r = await prisma.reservation.findUnique({
    where: { id: reservationId },
  });
  if (!r || r.userId !== user.id) {
    return { ok: false, error: "該当する予約が見つかりませんでした。" };
  }
  if (!isCancellable(r.status)) {
    return {
      ok: false,
      error: "この予約は現在キャンセルできません（発送済み・返却済み・キャンセル済み）。",
    };
  }

  await prisma.reservation.update({
    where: { id: r.id },
    data: { status: "cancelled" },
  });
  revalidateAfterCancel(r.id);
  return { ok: true, status: "cancelled" };
}

/**
 * 予約照会（受付番号＋メール）からのキャンセル。両方一致し、受付状態のときのみ可。
 */
export async function cancelReservationByLookup(input: {
  orderNumber: string;
  email: string;
}): Promise<CancelResult> {
  const orderNumber = input.orderNumber?.trim();
  const email = input.email?.trim().toLowerCase();
  if (!orderNumber || !email) {
    return { ok: false, error: "受付番号とメールアドレスを入力してください。" };
  }

  const r = await prisma.reservation.findUnique({ where: { orderNumber } });
  if (!r || r.email.trim().toLowerCase() !== email) {
    return { ok: false, error: "該当する予約が見つかりませんでした。" };
  }
  if (!isCancellable(r.status)) {
    return {
      ok: false,
      error: "この予約は現在キャンセルできません（発送済み・返却済み・キャンセル済み）。",
    };
  }

  await prisma.reservation.update({
    where: { id: r.id },
    data: { status: "cancelled" },
  });
  revalidateAfterCancel(r.id);
  return { ok: true, status: "cancelled" };
}
