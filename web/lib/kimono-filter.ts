import type { Kimono } from "./types";

// 商品一覧の検索・並び替え（純粋ロジック）。
// DB から取得済みの配列に対して適用する。件数が少ないため in-memory で処理し、
// SQLite の大文字小文字・日本語照合の差異を避ける。

export const sortOptions = [
  { id: "recommended", label: "おすすめ順" },
  { id: "price-asc", label: "料金が安い順" },
  { id: "price-desc", label: "料金が高い順" },
] as const;

export type SortId = (typeof sortOptions)[number]["id"];

export function isSortId(v: string): v is SortId {
  return sortOptions.some((o) => o.id === v);
}

/** キーワード検索（名前・説明・素材・色を対象、大文字小文字を無視） */
export function filterKimonos(items: Kimono[], q: string): Kimono[] {
  const term = q.trim().toLowerCase();
  if (!term) return items;
  return items.filter((k) => {
    const haystack = [
      k.name,
      k.description,
      k.material,
      ...k.colors,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(term);
  });
}

/** 並び替え（元配列は変更しない） */
export function sortKimonos(items: Kimono[], sort: string): Kimono[] {
  const copy = [...items];
  switch (sort) {
    case "price-asc":
      copy.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      copy.sort((a, b) => b.price - a.price);
      break;
    default:
      // recommended: 取得順（おすすめ＝既定）のまま
      break;
  }
  return copy;
}

/** 検索→並び替えをまとめて適用 */
export function applyKimonoQuery(
  items: Kimono[],
  opts: { q?: string; sort?: string },
): Kimono[] {
  return sortKimonos(filterKimonos(items, opts.q ?? ""), opts.sort ?? "recommended");
}
