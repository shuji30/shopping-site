import "server-only";
import { prisma } from "./db";

/** 予約一覧（新しい順、明細件数付き） */
export async function getReservations() {
  return prisma.reservation.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });
}

/** 予約1件（明細付き） */
export async function getReservationById(id: string) {
  return prisma.reservation.findUnique({
    where: { id },
    include: { items: true },
  });
}

/** 指定予約に紐づく送信メール（新しい順） */
export async function getEmailsByReservation(reservationId: string) {
  return prisma.emailLog.findMany({
    where: { reservationId },
    orderBy: { createdAt: "desc" },
  });
}

/** 指定ユーザーの予約履歴（新しい順、明細付き） */
export async function getReservationsByUser(userId: string) {
  return prisma.reservation.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
}

/** ダッシュボード用の集計（件数・売上合計・入金状況） */
export async function getReservationStats() {
  const [count, sum, paidCount, paidSum] = await Promise.all([
    prisma.reservation.count(),
    prisma.reservation.aggregate({ _sum: { total: true } }),
    prisma.reservation.count({ where: { paymentStatus: "paid" } }),
    prisma.reservation.aggregate({
      _sum: { total: true },
      where: { paymentStatus: "paid" },
    }),
  ]);
  return {
    count,
    revenue: sum._sum.total ?? 0,
    paidCount,
    paidRevenue: paidSum._sum.total ?? 0,
  };
}
