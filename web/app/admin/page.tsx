import Link from "next/link";
import type { Metadata } from "next";
import {
  getReservationStats,
  getReservations,
} from "@/lib/reservation-repository";
import { formatDateTime } from "@/lib/datetime";

export const metadata: Metadata = { title: "ダッシュボード（管理）" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [stats, reservations] = await Promise.all([
    getReservationStats(),
    getReservations(),
  ]);
  const recent = reservations.slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-serif text-2xl text-kon">ダッシュボード</h1>

      {/* 集計タイル */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-kin/20 bg-white/60 p-6">
          <p className="text-sm text-sumi/60">予約件数</p>
          <p className="mt-2 text-3xl font-semibold text-kon">
            {stats.count}
            <span className="ml-1 text-base font-normal text-sumi/60">件</span>
          </p>
        </div>
        <div className="rounded-lg border border-kin/20 bg-white/60 p-6">
          <p className="text-sm text-sumi/60">売上合計（申込ベース）</p>
          <p className="mt-2 text-3xl font-semibold text-kon">
            ¥{stats.revenue.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-kin/20 bg-white/60 p-6">
          <p className="text-sm text-sumi/60">入金済み</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">
            {stats.paidCount}
            <span className="ml-1 text-base font-normal text-sumi/60">
              / {stats.count} 件
            </span>
          </p>
        </div>
        <div className="rounded-lg border border-kin/20 bg-white/60 p-6">
          <p className="text-sm text-sumi/60">入金額（決済済み）</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">
            ¥{stats.paidRevenue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* 最近の予約 */}
      <div className="mt-8 flex items-end justify-between">
        <h2 className="font-serif text-lg text-kon">最近の予約</h2>
        <Link
          href="/admin/reservations"
          className="text-sm text-kon underline-offset-4 hover:underline"
        >
          すべて見る →
        </Link>
      </div>

      {recent.length === 0 ? (
        <p className="mt-8 text-center text-sumi/60">予約はまだありません。</p>
      ) : (
        <ul className="mt-4 divide-y divide-kin/20 rounded-lg border border-kin/20 bg-white/60">
          {recent.map((r) => (
            <li key={r.id}>
              <Link
                href={`/admin/reservations/${r.id}`}
                className="flex items-center justify-between px-5 py-3 text-sm transition hover:bg-washi-dark/40"
              >
                <span className="font-mono text-xs text-sumi/70">
                  {r.orderNumber}
                </span>
                <span className="flex-1 px-4 text-sumi/90">{r.name}</span>
                <span className="text-sumi/60">
                  {formatDateTime(r.createdAt)}
                </span>
                <span className="ml-4 font-semibold text-kon">
                  ¥{r.total.toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
