"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCategoryById } from "@/lib/category-repository";
import { countReservationItemsForKimono } from "@/lib/kimono-repository";
import {
  firstKimonoError,
  hasKimonoErrors,
  parseList,
  parsePositiveInt,
  validateKimono,
  type KimonoInput,
} from "@/lib/kimono-validation";

// 管理画面から商品マスタを登録・変更・削除する。
// /admin 配下から呼ばれ、middleware の Basic 認証で保護される。
//
// sizes/colors/images は SQLite に JSON 文字列で保存する（配列型が無いため）。
// フォームからはカンマ区切りの文字列で受け取り、ここで配列 → JSON に変換する。

export interface KimonoActionResult {
  ok: boolean;
  error?: string;
}

/** 商品を表示している画面をまとめて再検証する */
function revalidateKimonoViews(id?: string) {
  revalidatePath("/admin/kimonos");
  revalidatePath("/kimonos");
  revalidatePath("/"); // トップの注目商品・掲載点数・料金レンジ
  if (id) revalidatePath(`/kimono/${id}`);
}

/** 検証済みの入力を DB のカラム値へ変換する */
function toColumns(input: KimonoInput) {
  return {
    name: input.name.trim(),
    category: input.category.trim(),
    price: parsePositiveInt(input.price)!,
    rentalDays: parsePositiveInt(input.rentalDays)!,
    sizes: JSON.stringify(parseList(input.sizes)),
    colors: JSON.stringify(parseList(input.colors)),
    images: JSON.stringify(parseList(input.images)),
    material: input.material.trim(),
    description: input.description.trim(),
    inStock: Boolean(input.inStock),
    featured: Boolean(input.featured),
  };
}

export async function createKimono(
  input: KimonoInput,
): Promise<KimonoActionResult> {
  const errors = validateKimono(input, "create");
  if (hasKimonoErrors(errors)) {
    return { ok: false, error: firstKimonoError(errors) };
  }

  const id = input.id.trim();
  const existing = await prisma.kimono.findUnique({ where: { id } });
  if (existing) {
    return { ok: false, error: `識別子「${id}」はすでに使われています。` };
  }

  // カテゴリはマスタに存在するものだけ許す（存在しないと一覧から辿れなくなる）
  const category = await getCategoryById(input.category.trim());
  if (!category) {
    return { ok: false, error: "選択したカテゴリが見つかりません。" };
  }

  await prisma.kimono.create({ data: { id, ...toColumns(input) } });

  revalidateKimonoViews(id);
  return { ok: true };
}

/**
 * 商品の内容を変更する。
 * **識別子は変更できない**（商品URL `/kimono/<id>` と、予約明細
 * `ReservationItem.kimonoId` が壊れるため）。カテゴリと同じ方針。
 */
export async function updateKimono(
  id: string,
  input: Omit<KimonoInput, "id">,
): Promise<KimonoActionResult> {
  const errors = validateKimono({ ...input, id }, "update");
  if (hasKimonoErrors(errors)) {
    return { ok: false, error: firstKimonoError(errors) };
  }

  const existing = await prisma.kimono.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "商品が見つかりません。" };
  }

  const category = await getCategoryById(input.category.trim());
  if (!category) {
    return { ok: false, error: "選択したカテゴリが見つかりません。" };
  }

  await prisma.kimono.update({
    where: { id },
    data: toColumns({ ...input, id }),
  });

  revalidateKimonoViews(id);
  return { ok: true };
}

/**
 * 商品を削除する。
 * 予約明細から参照されている場合は拒否する（過去の予約履歴が壊れるため）。
 * 掲載を止めたいだけなら「在庫なし」にしてもらう。
 */
export async function deleteKimono(id: string): Promise<KimonoActionResult> {
  const existing = await prisma.kimono.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "商品が見つかりません。" };
  }

  const count = await countReservationItemsForKimono(id);
  if (count > 0) {
    return {
      ok: false,
      error:
        `この商品は予約${count}件で使われているため削除できません。` +
        `掲載を止めるだけなら「在庫なし」にしてください。`,
    };
  }

  // レビューは商品に紐づくだけなので、商品と一緒に消す（残すと孤児になる）
  await prisma.review.deleteMany({ where: { kimonoId: id } });
  await prisma.kimono.delete({ where: { id } });

  revalidateKimonoViews(id);
  return { ok: true };
}
