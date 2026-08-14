import "server-only";
import { prisma } from "./db";
import { rentalEndDate, rangesOverlap, type DateRange } from "./date";

/** 指定商品の「確定済み予約」による貸出中期間の一覧を取得 */
export async function getReservedRanges(
  kimonoId: string,
): Promise<DateRange[]> {
  const items = await prisma.reservationItem.findMany({
    where: { kimonoId },
    select: { startDate: true, rentalDays: true },
  });
  return items
    .map((i) => ({
      start: i.startDate,
      end: rentalEndDate(i.startDate, i.rentalDays),
    }))
    .sort((a, b) => a.start.localeCompare(b.start));
}

/**
 * 指定商品の希望期間（開始日＋日数）が、既存予約と重複しないか判定。
 * 重複していれば false（予約不可）。
 */
export async function isRangeAvailable(
  kimonoId: string,
  startDate: string,
  rentalDays: number,
): Promise<boolean> {
  const end = rentalEndDate(startDate, rentalDays);
  const reserved = await getReservedRanges(kimonoId);
  return !reserved.some((r) => rangesOverlap(startDate, end, r.start, r.end));
}
