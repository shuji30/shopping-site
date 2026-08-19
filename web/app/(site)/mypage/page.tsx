import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getReservationsByUser } from "@/lib/reservation-repository";
import { formatDateTime } from "@/lib/datetime";
import { formatJP, rentalEndDate, latestReturnDate } from "@/lib/date";
import { StatusBadge } from "@/components/StatusBadge";
import { PaymentBadge } from "@/components/PaymentBadge";
import { PayNowButton } from "@/components/PayNowButton";
import { CancelButton } from "@/components/CancelButton";
import { isCancellable } from "@/lib/reservation-status";

export const metadata: Metadata = { title: "マイページ" };
export const dynamic = "force-dynamic";

export default async function MyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const reservations = await getReservationsByUser(user.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-serif text-3xl text-kon">マイページ</h1>
      <p className="mt-2 text-sm text-sumi/70">
        {user.name} 様（{user.email}）
      </p>

      <h2 className="mt-8 font-serif text-xl text-kon">予約履歴</h2>

      {reservations.length === 0 ? (
        <div className="mt-6 rounded-lg border border-kin/20 bg-white/60 px-6 py-16 text-center">
          <p className="text-sumi/70">まだ予約がありません。</p>
          <Link
            href="/kimonos"
            className="mt-4 inline-block rounded-full bg-kon px-6 py-2.5 text-sm text-washi transition hover:bg-kon-light"
          >
            着物を探す
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {reservations.map((r) => {
            const due = latestReturnDate(r.items);
            return (
              <li
                key={r.id}
                className="rounded-lg border border-kin/20 bg-white/60 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-sumi/60">
                      {r.orderNumber}
                    </span>
                    <StatusBadge status={r.status} />
                    <PaymentBadge status={r.paymentStatus} />
                  </div>
                  <span className="text-xs text-sumi/60">
                    {formatDateTime(r.createdAt)}
                  </span>
                </div>

                <ul className="mt-3 divide-y divide-kin/15 border-y border-kin/15">
                  {r.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex justify-between py-2 text-sm"
                    >
                      <span className="text-sumi/90">
                        {item.name}（{item.size} / {formatJP(item.startDate)}〜
                        {formatJP(rentalEndDate(item.startDate, item.rentalDays))}
                        ）
                      </span>
                      <span className="text-sumi/80">
                        ¥{item.price.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-sumi/60">
                    {due ? `返却期限 ${formatJP(due)}` : ""}
                  </span>
                  <span className="font-semibold text-kon">
                    合計 ¥{r.total.toLocaleString()}
                  </span>
                </div>

                {(isCancellable(r.status) ||
                  (r.paymentStatus === "unpaid" && r.status !== "cancelled")) && (
                  <div className="mt-4 flex flex-wrap items-start justify-end gap-3 border-t border-kin/15 pt-4">
                    {isCancellable(r.status) && (
                      <CancelButton reservationId={r.id} />
                    )}
                    {r.paymentStatus === "unpaid" && r.status !== "cancelled" && (
                      <div>
                        <PayNowButton reservationId={r.id} amount={r.total} />
                        <p className="mt-2 text-right text-xs text-sumi/50">
                          ※ テストモードの決済です。実際の課金は行われません。
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
