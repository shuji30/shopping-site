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

export type LatestReview = {
  id: string;
  kimonoId: string;
  kimonoName: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: Date;
};

/**
 * 全商品を横断した最新レビュー（トップページ「お客様の声」用）。
 * Review-Kimono 間に Prisma のリレーションを張っていないため、
 * 商品名はアプリ側で付き合わせる。対象の商品が見つからない場合は除外する。
 */
export async function getLatestReviews(limit: number): Promise<LatestReview[]> {
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  if (reviews.length === 0) return [];

  const kimonoIds = [...new Set(reviews.map((r) => r.kimonoId))];
  const kimonos = await prisma.kimono.findMany({
    where: { id: { in: kimonoIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(kimonos.map((k) => [k.id, k.name]));

  return reviews
    .map((r) => ({
      id: r.id,
      kimonoId: r.kimonoId,
      kimonoName: nameById.get(r.kimonoId) ?? "",
      name: r.name,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    }))
    .filter((r) => r.kimonoName !== "");
}
