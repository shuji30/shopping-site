import type { Metadata } from "next";
import { CheckoutView } from "@/components/CheckoutView";
import { getCurrentUser } from "@/lib/auth";
import { getLatestReservationContact } from "@/lib/reservation-repository";

export const metadata: Metadata = {
  title: "予約申込",
  description: "レンタルのお申込内容とお客様情報を入力してください。",
};

// ログイン中なら会員情報＋直近の予約内容をフォームの初期値として埋める
async function getInitialValues() {
  const user = await getCurrentUser();
  if (!user) return undefined;

  const latest = await getLatestReservationContact(user.id);
  return {
    name: user.name,
    email: user.email,
    kana: latest?.kana ?? "",
    tel: latest?.tel ?? "",
    method: latest?.method === "store" ? ("store" as const) : ("delivery" as const),
    address: latest?.address ?? "",
  };
}

export default async function CheckoutPage() {
  const initialValues = await getInitialValues();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-serif text-3xl text-kon">予約申込</h1>
      <CheckoutView initialValues={initialValues} />
    </div>
  );
}
