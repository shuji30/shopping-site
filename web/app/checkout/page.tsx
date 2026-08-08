import type { Metadata } from "next";
import { CheckoutView } from "@/components/CheckoutView";

export const metadata: Metadata = {
  title: "予約申込",
  description: "レンタルのお申込内容とお客様情報を入力してください。",
};

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-serif text-3xl text-kon">予約申込</h1>
      <CheckoutView />
    </div>
  );
}
