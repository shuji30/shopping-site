"use client";

import { useState } from "react";
import { lookupReservation, type LookupResult } from "@/lib/actions/lookup";
import { payReservation } from "@/lib/actions/payment";
import { cancelReservationByLookup } from "@/lib/actions/cancel";
import { formatJP, rentalEndDate, latestReturnDate } from "@/lib/date";
import { formatDateTime } from "@/lib/datetime";
import { StatusBadge } from "@/components/StatusBadge";
import { PaymentBadge } from "@/components/PaymentBadge";
import { isCancellable } from "@/lib/reservation-status";

export function OrderLookup() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setPayError(null);
    try {
      const res = await lookupReservation({ orderNumber, email });
      setResult(res);
    } catch {
      setResult({ ok: false, error: "通信エラーが発生しました。" });
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!result?.ok || !result.reservation) return;
    if (!window.confirm("この予約をキャンセルします。よろしいですか？")) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await cancelReservationByLookup({ orderNumber, email });
      if (!res.ok) {
        setCancelError(res.error ?? "キャンセルに失敗しました。");
        return;
      }
      setResult((prev) =>
        prev?.ok && prev.reservation
          ? {
              ...prev,
              reservation: { ...prev.reservation, status: "cancelled" },
            }
          : prev,
      );
    } catch {
      setCancelError("通信エラーが発生しました。時間をおいて再度お試しください。");
    } finally {
      setCancelling(false);
    }
  }

  async function handlePay() {
    if (!result?.ok || !result.reservation) return;
    setPaying(true);
    setPayError(null);
    try {
      const res = await payReservation({ orderNumber, email });
      if (!res.ok) {
        setPayError(res.error ?? "決済に失敗しました。");
        return;
      }
      // 成功時は結果の決済ステータスを支払い済みに更新
      setResult((prev) =>
        prev?.ok && prev.reservation
          ? {
              ...prev,
              reservation: { ...prev.reservation, paymentStatus: "paid" },
            }
          : prev,
      );
    } catch {
      setPayError("通信エラーが発生しました。時間をおいて再度お試しください。");
    } finally {
      setPaying(false);
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
              <div className="flex items-center gap-2">
                <PaymentBadge status={r.paymentStatus} />
                <StatusBadge status={r.status} />
              </div>
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

            {/* オンライン決済（テストモード） */}
            <div className="mt-6 border-t border-kin/20 pt-5">
              {r.paymentStatus === "paid" ? (
                <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  お支払いは完了しています。ありがとうございます。
                </p>
              ) : r.status === "cancelled" ? (
                <p className="rounded-md bg-washi-dark px-4 py-3 text-sm text-sumi/60">
                  キャンセル済みの予約のため、お支払いはできません。
                </p>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handlePay}
                    disabled={paying}
                    className={
                      paying
                        ? "w-full cursor-wait rounded-full bg-kon/50 px-6 py-3 text-sm font-medium text-washi/70"
                        : "w-full rounded-full bg-kon px-6 py-3 text-sm font-medium text-washi transition hover:bg-kon-light"
                    }
                  >
                    {paying
                      ? "処理中..."
                      : `オンライン決済でお支払い（¥${r.total.toLocaleString()}）`}
                  </button>
                  {payError && (
                    <p className="mt-3 rounded-md bg-enji/10 px-4 py-3 text-sm text-enji">
                      {payError}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-sumi/50">
                    ※ テストモードの決済です。実際の課金は行われません。
                  </p>
                </>
              )}
            </div>

            {/* 予約キャンセル（受付状態のみ） */}
            {isCancellable(r.status) && (
              <div className="mt-4 border-t border-kin/20 pt-5">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className={
                    cancelling
                      ? "w-full cursor-wait rounded-full border border-enji/30 px-6 py-3 text-sm font-medium text-enji/50"
                      : "w-full rounded-full border border-enji/40 px-6 py-3 text-sm font-medium text-enji transition hover:bg-enji/5"
                  }
                >
                  {cancelling ? "処理中..." : "予約をキャンセルする"}
                </button>
                {cancelError && (
                  <p className="mt-3 rounded-md bg-enji/10 px-4 py-3 text-sm text-enji">
                    {cancelError}
                  </p>
                )}
              </div>
            )}
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
