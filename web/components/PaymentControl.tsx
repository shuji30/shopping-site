"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePaymentStatus } from "@/lib/actions/admin-payment";
import { paymentStatusLabels, type PaymentStatus } from "@/lib/payment";

const options: PaymentStatus[] = ["unpaid", "paid", "refunded"];

/** 管理画面：入金ステータスの変更操作 */
export function PaymentControl({
  id,
  current,
}: {
  id: string;
  current: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function change(status: PaymentStatus) {
    setError(null);
    startTransition(async () => {
      const res = await updatePaymentStatus(id, status);
      if (!res.ok) {
        setError(res.error ?? "更新に失敗しました。");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((s) => {
          const active = s === current;
          return (
            <button
              key={s}
              type="button"
              disabled={pending || active}
              onClick={() => change(s)}
              className={
                active
                  ? "cursor-default rounded-md bg-kon px-4 py-2 text-sm text-washi"
                  : "rounded-md border border-kin/40 px-4 py-2 text-sm text-sumi/80 transition hover:border-kin disabled:opacity-50"
              }
            >
              {paymentStatusLabels[s]}
            </button>
          );
        })}
      </div>
      {pending && <p className="mt-2 text-xs text-sumi/50">更新中...</p>}
      {error && <p className="mt-2 text-xs text-enji">{error}</p>}
    </div>
  );
}
