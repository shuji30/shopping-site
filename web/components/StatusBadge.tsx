import {
  statusClasses,
  statusLabel,
  isReservationStatus,
} from "@/lib/reservation-status";

/** 予約ステータスのバッジ */
export function StatusBadge({ status }: { status: string }) {
  const cls = isReservationStatus(status)
    ? statusClasses[status]
    : "bg-sumi/10 text-sumi/60";
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {statusLabel(status)}
    </span>
  );
}
