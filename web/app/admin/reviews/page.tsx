import Link from "next/link";
import type { Metadata } from "next";
import { getAllReviewsForAdmin } from "@/lib/review-repository";
import { formatDateTime } from "@/lib/datetime";
import { StarRating } from "@/components/StarRating";
import { DeleteReviewButton } from "@/components/DeleteReviewButton";

export const metadata: Metadata = { title: "レビュー管理（管理）" };

// 常に最新の DB 内容を表示する
export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const reviews = await getAllReviewsForAdmin();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-serif text-2xl text-kon">レビュー管理</h1>
      <p className="mt-1 text-sm text-sumi/60">
        {reviews.length}件（不適切な投稿はここから削除できます）
      </p>

      {reviews.length === 0 ? (
        <p className="mt-12 text-center text-sumi/60">
          レビューはまだありません。
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {reviews.map((rv) => (
            <li
              key={rv.id}
              className="rounded-lg border border-kin/20 bg-white/60 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <StarRating value={rv.rating} />
                    <span className="text-sm font-medium text-sumi/90">
                      {rv.name}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-sumi/60">
                    <Link
                      href={`/kimono/${rv.kimonoId}`}
                      className="hover:text-kon hover:underline"
                    >
                      {rv.kimonoName}
                    </Link>
                    {" ・ "}
                    {formatDateTime(rv.createdAt)}
                  </p>
                </div>
                <DeleteReviewButton id={rv.id} />
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-sumi/90">
                {rv.comment}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
