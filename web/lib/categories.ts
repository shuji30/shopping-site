import type { KimonoCategory } from "./types";

// カテゴリまわりの純粋ロジック。
//
// loop 71 でカテゴリマスタを DB へ移したため、ここにカテゴリの実データは持たない
// （初期データは data/categories.ts、読み取りは lib/category-repository.ts）。
// DB から取得済みの配列を受け取って扱うヘルパだけを置く。DOM にも Prisma にも
// 依存しないので、そのまま単体テストできる。

/** 配列から ID でカテゴリを引く */
export function findCategory(
  categories: KimonoCategory[],
  id: string,
): KimonoCategory | undefined {
  return categories.find((c) => c.id === id);
}

/** 表示名を引く。見つからなければ ID をそのまま返す（空欄にしない） */
export function getCategoryLabel(
  categories: KimonoCategory[],
  id: string,
): string {
  return findCategory(categories, id)?.label ?? id;
}

/** 表示順（sortOrder → id）に並べ替える。元配列は変更しない */
export function sortCategories(
  categories: KimonoCategory[],
): KimonoCategory[] {
  return [...categories].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
  );
}

/**
 * 新規カテゴリの sortOrder の既定値。
 * 末尾に来るよう、既存の最大値 + 10 を返す（10刻みにしておくと後から間に挟める）。
 */
export function nextSortOrder(categories: KimonoCategory[]): number {
  if (categories.length === 0) return 10;
  return Math.max(...categories.map((c) => c.sortOrder)) + 10;
}
