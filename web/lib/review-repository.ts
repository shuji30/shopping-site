import "server-only";
import { prisma } from "./db";
import { averageRating } from "./reviews";

/** 指定商品のレビュー一覧（新しい順） */
export async function getReviewsByKimono(kimonoId: string) {
  return prisma.review.findMany({
    where: { kimonoId },
    orderBy: { createdAt: "desc" },
  });
}

/** 指定商品のレビュー集計（件数・平均評価） */
export async function getReviewStats(
  kimonoId: string,
): Promise<{ count: number; average: number }> {
  const rows = await prisma.review.findMany({
    where: { kimonoId },
    select: { rating: true },
  });
  return {
    count: rows.length,
    average: averageRating(rows.map((r) => r.rating)),
  };
}
