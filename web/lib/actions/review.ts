"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { isValidRating } from "@/lib/reviews";
import { getCurrentUser } from "@/lib/auth";

export interface ReviewResult {
  ok: boolean;
  error?: string;
}

/**
 * レビューを投稿する。対象商品が存在し、評価が 1〜5、コメントが空でないことを検証。
 * ログイン中なら表示名を会員名で補完する。
 */
export async function createReview(input: {
  kimonoId: string;
  name: string;
  rating: number;
  comment: string;
}): Promise<ReviewResult> {
  const comment = input.comment?.trim();
  if (!isValidRating(input.rating)) {
    return { ok: false, error: "評価は1〜5から選んでください。" };
  }
  if (!comment) {
    return { ok: false, error: "コメントを入力してください。" };
  }

  const kimono = await prisma.kimono.findUnique({
    where: { id: input.kimonoId },
    select: { id: true },
  });
  if (!kimono) {
    return { ok: false, error: "対象の商品が見つかりませんでした。" };
  }

  const user = await getCurrentUser();
  const name = input.name?.trim() || user?.name || "匿名";

  await prisma.review.create({
    data: {
      kimonoId: input.kimonoId,
      name: name.slice(0, 40),
      rating: input.rating,
      comment: comment.slice(0, 1000),
    },
  });

  revalidatePath(`/kimono/${input.kimonoId}`);
  return { ok: true };
}
