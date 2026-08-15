// 予約のステータス（配送・返却フロー）

export type ReservationStatus =
  | "reserved" // 受付
  | "shipped" // 発送済み
  | "returned" // 返却済み
  | "cancelled"; // キャンセル

export const statusLabels: Record<ReservationStatus, string> = {
  reserved: "受付",
  shipped: "発送済み",
  returned: "返却済み",
  cancelled: "キャンセル",
};

/** バッジ配色（Tailwind クラス） */
export const statusClasses: Record<ReservationStatus, string> = {
  reserved: "bg-kon/10 text-kon",
  shipped: "bg-kin/20 text-kin",
  returned: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-sumi/10 text-sumi/60",
};

/** キャンセル以外の通常フロー順 */
export const statusFlow: ReservationStatus[] = [
  "reserved",
  "shipped",
  "returned",
];

export function isReservationStatus(v: string): v is ReservationStatus {
  return v === "reserved" || v === "shipped" || v === "returned" || v === "cancelled";
}

export function statusLabel(v: string): string {
  return isReservationStatus(v) ? statusLabels[v] : v;
}

/**
 * ユーザー自身がキャンセルできるか。
 * 受付（reserved）のみ可。発送済み・返却済み・キャンセル済みは不可。
 */
export function isCancellable(status: string): boolean {
  return status === "reserved";
}
