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

// ---- ページネーション（純粋ロジック） ----

/** 1ページあたりの表示件数 */
export const PAGE_SIZE = 8;

export interface Paged<T> {
  /** そのページに表示する要素 */
  items: T[];
  /** 正規化後の現在ページ（1始まり） */
  page: number;
  /** 総ページ数（0件でも 1） */
  totalPages: number;
  /** 絞り込み後の総件数 */
  total: number;
}

/** 総件数から総ページ数を求める。0件でも1ページ扱いにする（空の一覧を表示するため） */
export function countPages(total: number, pageSize: number = PAGE_SIZE): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * クエリ文字列のページ番号を正規化する。
 * 数値でない・1未満・総ページ数超過は、範囲内に丸める（404にはしない）。
 */
export function parsePage(v: string | undefined, pages: number): number {
  const n = Number.parseInt(v ?? "", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, Math.max(1, pages));
}

/** 配列を1ページ分に切り出す。ページ番号は範囲内に丸めてから使う */
export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number = PAGE_SIZE,
): Paged<T> {
  const totalPages = countPages(items.length, pageSize);
  const current = Math.min(Math.max(Math.trunc(page) || 1, 1), totalPages);
  const start = (current - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: current,
    totalPages,
    total: items.length,
  };
}

/**
 * ページ番号ボタンとして並べる連番。現在ページを中心に最大 max 個、
 * 端では反対側に寄せて常に max 個（総ページ数が max 未満ならその数）を返す。
 */
export function pageWindow(page: number, totalPages: number, max = 5): number[] {
  const pages = Math.max(1, totalPages);
  const size = Math.min(max, pages);
  const current = Math.min(Math.max(page, 1), pages);
  let start = current - Math.floor(size / 2);
  start = Math.max(1, Math.min(start, pages - size + 1));
  return Array.from({ length: size }, (_, i) => start + i);
}
