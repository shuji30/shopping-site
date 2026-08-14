"use client";

import { useState } from "react";
import { lookupReservation, type LookupResult } from "@/lib/actions/lookup";
import { formatJP, rentalEndDate, latestReturnDate } from "@/lib/date";
import { formatDateTime } from "@/lib/datetime";
import { StatusBadge } from "@/components/StatusBadge";

export function OrderLookup() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await lookupReservation({ orderNumber, email });
      setResult(res);
    } catch {
      setResult({ ok: false, error: "通信エラーが発生しました。" });
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "mt-1 block w-full rounded-md border border-kin/40 bg-white/70 px-3 py-2 text-sm text-sumi focus:border-kon focus:outline-none";

  const r = result?.ok ? result.reservation : undefined;

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      {/* 照会フォーム */}
      <form
        onSubmit={handleSubmit}
        className="h-fit space-y-4 rounded-lg border border-kin/20 bg-white/60 p-6"
      >
        <div>
          <label
            htmlFor="orderNumber"
            className="text-sm font-medium text-sumi/80"
          >
            受付番号
          </label>
          <input
            id="orderNumber"
            type="text"
            placeholder="MYB-20260808-1234"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="lookup-email" className="text-sm font-medium text-sumi/80">
            メールアドレス
          </label>
          <input
            id="lookup-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className={
            loading
              ? "w-full cursor-wait rounded-full bg-kin/50 px-6 py-3 text-sm font-medium text-sumi/60"
              : "w-full rounded-full bg-kin px-6 py-3 text-sm font-medium text-sumi transition hover:bg-kin/90"
          }
        >
          {loading ? "照会中..." : "予約を照会する"}
        </button>
        {result && !result.ok && (
          <p className="rounded-md bg-enji/10 px-4 py-3 text-sm text-enji">
            {result.error}
          </p>
        )}
      </form>

      {/* 照会結果 */}
      <div>
        {r ? (
          <div className="rounded-lg border border-kin/20 bg-white/60 p-6">
            <div className="flex items-center justify-between">
              <p className="font-serif text-lg text-kon">予約内容</p>
              <StatusBadge status={r.status} />
            </div>
            <dl className="mt-4 space-y-1 text-sm">
              <div className="flex">
                <dt className="w-24 shrink-0 text-sumi/60">受付番号</dt>
                <dd className="font-mono text-xs text-sumi/90">
                  {r.orderNumber}
                </dd>
              </div>
              <div className="flex">
                <dt className="w-24 shrink-0 text-sumi/60">お名前</dt>
                <dd className="text-sumi/90">{r.name} 様</dd>
              </div>
              <div className="flex">
                <dt className="w-24 shrink-0 text-sumi/60">申込日時</dt>
                <dd className="text-sumi/90">
                  {formatDateTime(new Date(r.createdAt))}
                </dd>
              </div>
              <div className="flex">
                <dt className="w-24 shrink-0 text-sumi/60">受取方法</dt>
                <dd className="text-sumi/90">
                  {r.method === "delivery" ? "配送" : "店頭受取"}
                </dd>
              </div>
              {latestReturnDate(r.items) && (
                <div className="flex">
                  <dt className="w-24 shrink-0 text-sumi/60">返却期限</dt>
                  <dd className="text-sumi/90">
                    {formatJP(latestReturnDate(r.items)!)}
                  </dd>
                </div>
              )}
            </dl>

            <ul className="mt-4 divide-y divide-kin/20 border-y border-kin/20">
              {r.items.map((item, idx) => (
                <li key={idx} className="py-3 text-sm">
                  <p className="text-sumi/90">{item.name}</p>
                  <p className="text-xs text-sumi/60">
                    {item.size} / {formatJP(item.startDate)} 〜{" "}
                    {formatJP(rentalEndDate(item.startDate, item.rentalDays))}
                  </p>
                  <p className="text-xs text-kon">
                    ¥{item.price.toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-right font-semibold text-kon">
              合計 ¥{r.total.toLocaleString()}
            </p>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-kin/30 px-6 py-16 text-center text-sm text-sumi/50">
            受付番号とメールアドレスを入力すると、
            <br />
            予約内容がこちらに表示されます。
          </div>
        )}
      </div>
    </div>
  );
}
