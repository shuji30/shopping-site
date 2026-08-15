// レビューの評価に関する純粋ロジック（外部依存なし）。

export const MIN_RATING = 1;
export const MAX_RATING = 5;

/** 有効な星評価（1〜5の整数）か */
export function isValidRating(n: number): boolean {
  return Number.isInteger(n) && n >= MIN_RATING && n <= MAX_RATING;
}

/**
 * 平均評価（小数第1位に丸め）。空配列は 0。
 * 無効値（範囲外・非整数）は無視して集計する。
 */
export function averageRating(ratings: number[]): number {
  const valid = ratings.filter(isValidRating);
  if (valid.length === 0) return 0;
  const sum = valid.reduce((a, b) => a + b, 0);
  return Math.round((sum / valid.length) * 10) / 10;
}
