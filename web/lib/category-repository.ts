import "server-only";
import { prisma } from "./db";
import type { KimonoCategory } from "./types";

// カテゴリマスタの読み取り。
// loop 71 でハードコード（旧 lib/categories.ts）から DB へ移した。
// 書き込み（登録・変更・削除）は管理画面のサーバーアクション側で行う。

type CategoryRow = {
  id: string;
  label: string;
  description: string;
  sortOrder: number;
};

function toDomain(row: CategoryRow): KimonoCategory {
  return {
    id: row.id,
    label: row.label,
    description: row.description,
    sortOrder: row.sortOrder,
  };
}

/** 表示順（sortOrder → id）で全件取得 */
export async function getCategories(): Promise<KimonoCategory[]> {
  const rows = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  return rows.map(toDomain);
}

export async function getCategoryById(
  id: string,
): Promise<KimonoCategory | null> {
  const row = await prisma.category.findUnique({ where: { id } });
  return row ? toDomain(row) : null;
}

/** 識別子 → 表示名の対応表。商品にラベルを埋めるときに使う */
export async function getCategoryLabelMap(): Promise<Map<string, string>> {
  const rows = await prisma.category.findMany({
    select: { id: true, label: true },
  });
  return new Map(rows.map((r) => [r.id, r.label]));
}

/** そのカテゴリに属する商品の件数（削除可否の判定に使う） */
export async function countKimonosInCategory(id: string): Promise<number> {
  return prisma.kimono.count({ where: { category: id } });
}
