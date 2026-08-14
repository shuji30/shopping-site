import {
  paymentStatusClasses,
  paymentStatusLabel,
  isPaymentStatus,
} from "@/lib/payment";

/** オンライン決済ステータスのバッジ */
export function PaymentBadge({ status }: { status: string }) {
  const cls = isPaymentStatus(status)
    ? paymentStatusClasses[status]
    : "bg-sumi/10 text-sumi/60";
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {paymentStatusLabel(status)}
    </span>
  );
}
