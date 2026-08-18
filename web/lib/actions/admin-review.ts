"use server";

import { revalidatePath } from "next/cache";
import { deleteReview } from "@/lib/review-repository";

// 管理画面からレビューを削除する（不適切な投稿のモデレーション用）。
// /admin 配下から呼ばれ、middleware の Basic 認証で保護される。
export async function deleteReviewAction(id: string) {
  const deleted = await deleteReview(id);
  if (!deleted) {
    return { ok: false, error: "レビューが見つかりません。" };
  }

  revalidatePath("/admin/reviews");
  revalidatePath(`/kimono/${deleted.kimonoId}`);
  revalidatePath("/"); // トップページの「お客様の声」にも反映
  return { ok: true };
}
