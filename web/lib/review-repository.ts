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

type ReviewRow = {
  id: string;
  kimonoId: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: Date;
};

/**
 * レビュー配列に商品名を付き合わせる。
 * Review-Kimono 間に Prisma のリレーションを張っていないため、アプリ側で付き合わせる。
 * 対象の商品が見つからない場合（削除済み等）は kimonoName が null になる。
 */
async function attachKimonoNames(
  reviews: ReviewRow[],
): Promise<(ReviewRow & { kimonoName: string | null })[]> {
  if (reviews.length === 0) return [];

  const kimonoIds = [...new Set(reviews.map((r) => r.kimonoId))];
  const kimonos = await prisma.kimono.findMany({
    where: { id: { in: kimonoIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(kimonos.map((k) => [k.id, k.name]));

  return reviews.map((r) => ({
    ...r,
    kimonoName: nameById.get(r.kimonoId) ?? null,
  }));
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
 * 対象の商品が見つからない場合は除外する。
 */
export async function getLatestReviews(limit: number): Promise<LatestReview[]> {
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const withNames = await attachKimonoNames(reviews);
  return withNames
    .filter((r) => r.kimonoName !== null)
    .map((r) => ({ ...r, kimonoName: r.kimonoName as string }));
}

export type AdminReview = {
  id: string;
  kimonoId: string;
  kimonoName: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: Date;
};

/** 管理画面向け：全レビュー一覧（新しい順）。商品が見つからない場合は「(削除済み商品)」と表示する。 */
export async function getAllReviewsForAdmin(): Promise<AdminReview[]> {
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
  });
  const withNames = await attachKimonoNames(reviews);
  return withNames.map((r) => ({
    ...r,
    kimonoName: r.kimonoName ?? "(削除済み商品)",
  }));
}

/** 管理画面向け：レビューを削除する（モデレーション用）。削除できた場合は紐づく kimonoId を返す。 */
export async function deleteReview(id: string): Promise<{ kimonoId: string } | null> {
  const existing = await prisma.review.findUnique({
    where: { id },
    select: { kimonoId: true },
  });
  if (!existing) return null;

  await prisma.review.delete({ where: { id } });
  return existing;
}
