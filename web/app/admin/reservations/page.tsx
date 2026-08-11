import Link from "next/link";
import type { Metadata } from "next";
import { getReservations } from "@/lib/reservation-repository";
import { formatDateTime } from "@/lib/datetime";
import { StatusBadge } from "@/components/StatusBadge";

export const metadata: Metadata = { title: "予約一覧（管理）" };

// 常に最新の DB 内容を表示する
export const dynamic = "force-dynamic";

export default async function AdminReservationsPage() {
  const reservations = await getReservations();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-serif text-2xl text-kon">予約一覧</h1>
      <p className="mt-1 text-sm text-sumi/60">{reservations.length}件</p>

      {reservations.length === 0 ? (
        <p className="mt-12 text-center text-sumi/60">
          予約はまだありません。
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-kin/20 bg-white/60">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-kin/30 text-left text-sumi/60">
                <th className="px-4 py-3 font-medium">受付番号</th>
                <th className="px-4 py-3 font-medium">申込日時</th>
                <th className="px-4 py-3 font-medium">お名前</th>
                <th className="px-4 py-3 font-medium">状態</th>
                <th className="px-4 py-3 font-medium">受取</th>
                <th className="px-4 py-3 font-medium">点数</th>
                <th className="px-4 py-3 font-medium">合計</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-kin/15 last:border-0 hover:bg-washi-dark/40"
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    {r.orderNumber}
                  </td>
                  <td className="px-4 py-3">{formatDateTime(r.createdAt)}</td>
                  <td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3">
                    {r.method === "delivery" ? "配送" : "店頭"}
                  </td>
                  <td className="px-4 py-3">{r._count.items}</td>
                  <td className="px-4 py-3">¥{r.total.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/reservations/${r.id}`}
                      className="text-kon underline-offset-4 hover:underline"
                    >
                      詳細
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
