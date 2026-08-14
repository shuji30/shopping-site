import type { Metadata } from "next";
import { CartView } from "@/components/CartView";

export const metadata: Metadata = {
  title: "カート",
  description: "選択した着物のレンタル内容を確認できます。",
};

export default function CartPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-serif text-3xl text-kon">カート</h1>
      <CartView />
    </div>
  );
}
