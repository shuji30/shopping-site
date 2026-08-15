"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createReview } from "@/lib/actions/review";
import { MAX_RATING } from "@/lib/reviews";

/** レビュー投稿フォーム */
export function ReviewForm({ kimonoId }: { kimonoId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await createReview({ kimonoId, name, rating, comment });
      if (!res.ok) {
        setError(res.error ?? "投稿に失敗しました。");
        return;
      }
      setComment("");
      setName("");
      setRating(5);
      setDone(true);
      router.refresh();
    } catch {
      setError("通信エラーが発生しました。時間をおいて再度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  const fieldClass =
    "mt-1 block w-full rounded-md border border-kin/40 bg-white/70 px-3 py-2 text-sm text-sumi focus:border-kon focus:outline-none";

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-lg border border-kin/20 bg-white/60 p-5"
    >
      <p className="text-sm font-medium text-sumi/80">レビューを投稿する</p>

      {/* 星の選択 */}
      <div className="mt-3 flex items-center gap-1">
        {Array.from({ length: MAX_RATING }, (_, i) => {
          const n = i + 1;
          const active = n <= (hover || rating);
          return (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${n} 星`}
              className={active ? "text-kin" : "text-sumi/30"}
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill={active ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.9l-5.81 3.06 1.11-6.47-4.7-4.58 6.5-.95z" />
              </svg>
            </button>
          );
        })}
        <span className="ml-2 text-sm text-sumi/70">{rating} / 5</span>
      </div>

      <div className="mt-4">
        <label htmlFor="review-name" className="text-sm font-medium text-sumi/80">
          お名前（任意）
        </label>
        <input
          id="review-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="匿名"
          className={fieldClass}
        />
      </div>

      <div className="mt-4">
        <label
          htmlFor="review-comment"
          className="text-sm font-medium text-sumi/80"
        >
          コメント <span className="text-enji">*</span>
        </label>
        <textarea
          id="review-comment"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className={fieldClass}
        />
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-enji/10 px-4 py-2 text-sm text-enji">
          {error}
        </p>
      )}
      {done && !error && (
        <p className="mt-3 rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          レビューを投稿しました。ありがとうございます。
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className={
          busy
            ? "mt-4 cursor-wait rounded-full bg-kon/50 px-6 py-2.5 text-sm font-medium text-washi/70"
            : "mt-4 rounded-full bg-kon px-6 py-2.5 text-sm font-medium text-washi transition hover:bg-kon-light"
        }
      >
        {busy ? "投稿中..." : "投稿する"}
      </button>
    </form>
  );
}
