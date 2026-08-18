"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteReviewAction } from "@/lib/actions/admin-review";

/** 管理画面用: レビューを削除するボタン（モデレーション） */
export function DeleteReviewButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!window.confirm("このレビューを削除します。よろしいですか？")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await deleteReviewAction(id);
      if (!res.ok) {
        setError(res.error ?? "削除に失敗しました。");
        return;
      }
      router.refresh();
    } catch {
      setError("通信エラーが発生しました。時間をおいて再度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={
          busy
            ? "cursor-wait rounded-md border border-enji/30 px-3 py-1.5 text-xs font-medium text-enji/50"
            : "rounded-md border border-enji/40 px-3 py-1.5 text-xs font-medium text-enji transition hover:bg-enji/5"
        }
      >
        {busy ? "削除中..." : "削除"}
      </button>
      {error && <p className="mt-1 text-xs text-enji">{error}</p>}
    </div>
  );
}
