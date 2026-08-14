"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { payMyReservation } from "@/lib/actions/payment";

/** マイページ用: 自分の予約をその場で決済（テストモード）するボタン */
export function PayNowButton({
  reservationId,
  amount,
}: {
  reservationId: string;
  amount: number;
}) {
  const router = useRouter();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPaying(true);
    setError(null);
    try {
      const res = await payMyReservation(reservationId);
      if (!res.ok) {
        setError(res.error ?? "決済に失敗しました。");
        return;
      }
      // サーバー側で revalidate 済み。最新の決済状況を反映するため再取得
      router.refresh();
    } catch {
      setError("通信エラーが発生しました。時間をおいて再度お試しください。");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={handleClick}
        disabled={paying}
        className={
          paying
            ? "cursor-wait rounded-full bg-kon/50 px-5 py-2 text-xs font-medium text-washi/70"
            : "rounded-full bg-kon px-5 py-2 text-xs font-medium text-washi transition hover:bg-kon-light"
        }
      >
        {paying ? "処理中..." : `オンライン決済（¥${amount.toLocaleString()}）`}
      </button>
      {error && <p className="mt-2 text-xs text-enji">{error}</p>}
    </div>
  );
}
