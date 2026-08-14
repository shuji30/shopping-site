import type { Metadata } from "next";
import { OrderLookup } from "@/components/OrderLookup";

export const metadata: Metadata = {
  title: "予約照会",
  description: "受付番号とメールアドレスで、お申込内容を確認できます。",
};

export default function OrdersPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-serif text-3xl text-kon">予約照会</h1>
      <p className="mt-2 text-sm text-sumi/70">
        お申込時の受付番号とメールアドレスを入力してください。
      </p>
      <OrderLookup />
    </div>
  );
}
