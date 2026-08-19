import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getReservationById,
  getEmailsByReservation,
} from "@/lib/reservation-repository";
import { formatDateTime } from "@/lib/datetime";
import { formatJP, rentalEndDate, latestReturnDate } from "@/lib/date";
import { StatusBadge } from "@/components/StatusBadge";
import { PaymentBadge } from "@/components/PaymentBadge";
import { StatusControl } from "@/components/StatusControl";
import { PaymentControl } from "@/components/PaymentControl";

export const metadata: Metadata = { title: "予約詳細（管理）" };
export const dynamic = "force-dynamic";

export default async function AdminReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await getReservationById(id);
  if (!r) notFound();

  const emails = await getEmailsByReservation(r.id);
  const returnDue = latestReturnDate(r.items);

  const info: { label: string; value: string }[] = [
    { label: "受付番号", value: r.orderNumber },
    { label: "申込日時", value: formatDateTime(r.createdAt) },
    { label: "返却期限", value: returnDue ? formatJP(returnDue) : "—" },
    { label: "お名前", value: r.name },
    { label: "フリガナ", value: r.kana || "—" },
    { label: "メール", value: r.email },
    { label: "電話番号", value: r.tel },
    { label: "受取方法", value: r.method === "delivery" ? "配送" : "店頭受取" },
    { label: "配送先", value: r.address || "—" },
    { label: "備考", value: r.note || "—" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <nav className="text-sm text-sumi/60">
        <Link href="/admin/reservations" className="hover:text-kon">
          予約一覧
        </Link>
        <span className="mx-2">/</span>
        <span className="text-sumi/80">{r.orderNumber}</span>
      </nav>

      <div className="mt-4 flex items-center gap-3">
        <h1 className="font-serif text-2xl text-kon">予約詳細</h1>
        <StatusBadge status={r.status} />
        <PaymentBadge status={r.paymentStatus} />
      </div>

      {/* お客様情報 */}
      <dl className="mt-6 divide-y divide-kin/20 rounded-lg border border-kin/20 bg-white/60 px-5">
        {info.map((row) => (
          <div key={row.label} className="flex py-3 text-sm">
            <dt className="w-28 shrink-0 text-sumi/60">{row.label}</dt>
            <dd className="text-sumi/90">{row.value}</dd>
          </div>
        ))}
      </dl>

      {/* ステータス変更 */}
      <h2 className="mt-8 font-serif text-lg text-kon">ステータス変更</h2>
      <div className="mt-3">
        <StatusControl id={r.id} current={r.status} />
      </div>

      {/* 入金ステータス変更 */}
      <h2 className="mt-8 font-serif text-lg text-kon">入金ステータス変更</h2>
      <div className="mt-3">
        <PaymentControl id={r.id} current={r.paymentStatus} />
      </div>

      {/* 明細 */}
      <h2 className="mt-8 font-serif text-lg text-kon">レンタル明細</h2>
      <div className="mt-3 overflow-x-auto rounded-lg border border-kin/20 bg-white/60">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-kin/30 text-left text-sumi/60">
              <th className="px-4 py-3 font-medium">商品</th>
              <th className="px-4 py-3 font-medium">サイズ</th>
              <th className="px-4 py-3 font-medium">利用期間</th>
              <th className="px-4 py-3 font-medium">料金</th>
            </tr>
          </thead>
          <tbody>
            {r.items.map((item) => (
              <tr key={item.id} className="border-b border-kin/15 last:border-0">
                <td className="px-4 py-3">{item.name}</td>
                <td className="px-4 py-3">{item.size}</td>
                <td className="px-4 py-3">
                  {formatJP(item.startDate)} 〜{" "}
                  {formatJP(rentalEndDate(item.startDate, item.rentalDays))}
                </td>
                <td className="px-4 py-3">¥{item.price.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-right font-semibold text-kon">
        合計 ¥{r.total.toLocaleString()}
      </p>

      {/* 送信メール（モック） */}
      <h2 className="mt-8 font-serif text-lg text-kon">送信メール</h2>
      {emails.length === 0 ? (
        <p className="mt-3 text-sm text-sumi/60">送信されたメールはありません。</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {emails.map((m) => (
            <li
              key={m.id}
              className="rounded-lg border border-kin/20 bg-white/60 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium text-sumi/90">{m.subject}</span>
                <span className="text-xs text-sumi/60">
                  {m.to} ／ {formatDateTime(m.createdAt)}
                </span>
              </div>
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-washi-dark px-3 py-2 font-sans text-xs leading-relaxed text-sumi/80">
                {m.body}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
