"use server";

import { prisma } from "@/lib/db";

export interface LookupItem {
  name: string;
  size: string;
  startDate: string;
  rentalDays: number;
  price: number;
}

export interface LookupResult {
  ok: boolean;
  error?: string;
  reservation?: {
    orderNumber: string;
    name: string;
    method: "delivery" | "store";
    status: string;
    createdAt: string; // ISO 文字列
    total: number;
    items: LookupItem[];
  };
}

/**
 * 予約照会。受付番号とメールアドレスの**両方**が一致した場合のみ返す。
 * どちらが不一致かは明かさず、列挙攻撃や情報漏洩を防ぐ。
 */
export async function lookupReservation(input: {
  orderNumber: string;
  email: string;
}): Promise<LookupResult> {
  const orderNumber = input.orderNumber?.trim();
  const email = input.email?.trim().toLowerCase();
  if (!orderNumber || !email) {
    return {
      ok: false,
      error: "受付番号とメールアドレスを入力してください。",
    };
  }

  const r = await prisma.reservation.findUnique({
    where: { orderNumber },
    include: { items: true },
  });

  if (!r || r.email.trim().toLowerCase() !== email) {
    return {
      ok: false,
      error:
        "該当する予約が見つかりませんでした。受付番号とメールアドレスをご確認ください。",
    };
  }

  return {
    ok: true,
    reservation: {
      orderNumber: r.orderNumber,
      name: r.name,
      method: r.method === "delivery" ? "delivery" : "store",
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      total: r.total,
      items: r.items.map((i) => ({
        name: i.name,
        size: i.size,
        startDate: i.startDate,
        rentalDays: i.rentalDays,
        price: i.price,
      })),
    },
  };
}
