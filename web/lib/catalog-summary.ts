// トップページの訴求に使うカタログの要約（純粋ロジック）。
//
// 「いくらから借りられるのか」「何日間借りられるのか」を申込前に見せるための値。
// ハードコードすると商品を足したときに嘘になるので、必ず実データから算出する。

export interface CatalogSummary {
  count: number;
  minPrice: number;
  maxPrice: number;
  minDays: number;
  maxDays: number;
}

/** 商品配列から最小・最大を求める。空配列なら null（呼び出し側で非表示にする） */
export function summarizeCatalog(
  items: { price: number; rentalDays: number }[],
): CatalogSummary | null {
  if (items.length === 0) return null;
  const prices = items.map((i) => i.price);
  const days = items.map((i) => i.rentalDays);
  return {
    count: items.length,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    minDays: Math.min(...days),
    maxDays: Math.max(...days),
  };
}

/** 「¥6,000〜¥32,000」。最小と最大が同じなら1つだけ出す */
export function formatPriceRange(min: number, max: number): string {
  const yen = (v: number) => `¥${v.toLocaleString()}`;
  return min === max ? yen(min) : `${yen(min)}〜${yen(max)}`;
}

/** 「2〜4日」。最小と最大が同じなら1つだけ出す */
export function formatDaysRange(min: number, max: number): string {
  return min === max ? `${min}日` : `${min}〜${max}日`;
}

/**
 * 文言テンプレート内の {count} / {price} / {days} を実データで埋める。
 * データ（data/home-content.ts）に数値を持たせず、表示時に差し込むための橋渡し。
 */
export function fillCatalogNote(template: string, s: CatalogSummary): string {
  return template
    .replaceAll("{count}", String(s.count))
    .replaceAll("{price}", formatPriceRange(s.minPrice, s.maxPrice))
    .replaceAll("{days}", formatDaysRange(s.minDays, s.maxDays));
}
