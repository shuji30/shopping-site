"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelMyReservation } from "@/lib/actions/cancel";

/** マイページ用: 自分の予約（受付状態）をキャンセルするボタン */
export function CancelButton({ reservationId }: { reservationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!window.confirm("この予約をキャンセルします。よろしいですか？")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await cancelMyReservation(reservationId);
      if (!res.ok) {
        setError(res.error ?? "キャンセルに失敗しました。");
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
            ? "cursor-wait rounded-full border border-enji/30 px-5 py-2 text-xs font-medium text-enji/50"
            : "rounded-full border border-enji/40 px-5 py-2 text-xs font-medium text-enji transition hover:bg-enji/5"
        }
      >
        {busy ? "処理中..." : "予約をキャンセル"}
      </button>
      {error && <p className="mt-2 text-xs text-enji">{error}</p>}
    </div>
  );
}
