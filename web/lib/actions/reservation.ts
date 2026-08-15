"use server";

import { prisma } from "@/lib/db";
import { isRangeAvailable } from "@/lib/availability";
import { getCurrentUser } from "@/lib/auth";
import { sendMail } from "@/lib/mail";
import { reservationConfirmationEmail } from "@/lib/mail-templates";

export interface ReservationItemInput {
  kimonoId: string;
  size: string;
  startDate: string;
}

export interface ReservationInput {
  name: string;
  kana?: string;
  email: string;
  tel: string;
  method: "delivery" | "store";
  address?: string;
  note?: string;
  items: ReservationItemInput[];
}

export interface ReservationLine {
  name: string;
  size: string;
  startDate: string;
  rentalDays: number;
  price: number;
}

export interface ReservationResult {
  ok: boolean;
  orderNumber?: string;
  total?: number;
  items?: ReservationLine[];
  error?: string;
}

/** サンプル用の擬似採番（サーバー側で生成） */
function makeOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MYB-${y}${m}${d}-${rand}`;
}

/**
 * 予約申込を DB に保存する。料金・商品名・レンタル日数はクライアント値を信用せず
 * DB から引き直して確定する（改ざん防止）。
 */
export async function createReservation(
  input: ReservationInput,
): Promise<ReservationResult> {
  // 基本バリデーション（クライアントに加えてサーバーでも確認）
  if (!input.name?.trim() || !input.email?.trim() || !input.tel?.trim()) {
    return { ok: false, error: "必須項目が入力されていません。" };
  }
  if (input.method === "delivery" && !input.address?.trim()) {
    return { ok: false, error: "配送先住所が入力されていません。" };
  }
  if (!input.items?.length) {
    return { ok: false, error: "カートに商品がありません。" };
  }

  const ids = [...new Set(input.items.map((i) => i.kimonoId))];
  const kimonos = await prisma.kimono.findMany({ where: { id: { in: ids } } });
  const byId = new Map(kimonos.map((k) => [k.id, k]));

  const lines: (ReservationLine & { kimonoId: string })[] = [];
  for (const it of input.items) {
    const k = byId.get(it.kimonoId);
    if (!k) return { ok: false, error: "取り扱いのない商品が含まれています。" };
    if (!k.inStock) {
      return { ok: false, error: `「${k.name}」は現在貸出中です。` };
    }
    // 既存予約との重複（二重予約）を防止
    const available = await isRangeAvailable(k.id, it.startDate, k.rentalDays);
    if (!available) {
      return {
        ok: false,
        error: `「${k.name}」の選択期間はすでに予約済みです。別の日程をお選びください。`,
      };
    }
    lines.push({
      kimonoId: k.id,
      name: k.name,
      size: it.size,
      startDate: it.startDate,
      rentalDays: k.rentalDays,
      price: k.price,
    });
  }

  const total = lines.reduce((sum, l) => sum + l.price, 0);
  const orderNumber = makeOrderNumber();

  // ログイン中なら予約をユーザーに紐付ける
  const user = await getCurrentUser();

  const created = await prisma.reservation.create({
    data: {
      orderNumber,
      userId: user?.id ?? null,
      name: input.name,
      kana: input.kana || null,
      email: input.email,
      tel: input.tel,
      method: input.method,
      address: input.address || null,
      note: input.note || null,
      total,
      items: {
        create: lines.map((l) => ({
          kimonoId: l.kimonoId,
          name: l.name,
          size: l.size,
          startDate: l.startDate,
          rentalDays: l.rentalDays,
          price: l.price,
        })),
      },
    },
  });

  // 予約確認メール（モック送信＝記録）。送信失敗で予約自体は失敗させない。
  try {
    const mail = reservationConfirmationEmail({
      orderNumber,
      name: input.name,
      method: input.method,
      total,
      items: lines,
    });
    await sendMail({
      to: input.email,
      subject: mail.subject,
      body: mail.body,
      kind: "reservation_confirmation",
      reservationId: created.id,
    });
  } catch (e) {
    console.error("確認メールの記録に失敗しました", e);
  }

  return {
    ok: true,
    orderNumber,
    total,
    items: lines.map(({ name, size, startDate, rentalDays, price }) => ({
      name,
      size,
      startDate,
      rentalDays,
      price,
    })),
  };
}
