import Link from "next/link";
import type { Metadata } from "next";
import { getAllKimonos } from "@/data/kimonos";
import { categories, getCategoryLabel } from "@/lib/categories";
import { ProductCard } from "@/components/ProductCard";

export const metadata: Metadata = {
  title: "商品一覧",
  description: "レンタル可能な着物の一覧。カテゴリで絞り込めます。",
};

function chipClass(active: boolean): string {
  return active
    ? "rounded-full bg-kon px-4 py-1.5 text-sm text-washi"
    : "rounded-full border border-kin/40 px-4 py-1.5 text-sm text-sumi/80 transition hover:border-kin hover:text-kon";
}

export default async function KimonosPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const all = getAllKimonos();
  const active = categories.find((c) => c.id === category)?.id;
  const items = active ? all.filter((k) => k.category === active) : all;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-serif text-3xl text-kon">商品一覧</h1>

      {/* カテゴリ絞り込み */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/kimonos" className={chipClass(!active)}>
          すべて
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/kimonos?category=${c.id}`}
            className={chipClass(active === c.id)}
          >
            {c.label}
          </Link>
        ))}
      </div>

      <p className="mt-4 text-sm text-sumi/60">
        {items.length}件
        {active ? `（${getCategoryLabel(active)}）` : ""}
      </p>

      {items.length === 0 ? (
        <p className="mt-16 text-center text-sumi/60">
          該当する商品が見つかりませんでした。
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((k) => (
            <ProductCard key={k.id} kimono={k} />
          ))}
        </div>
      )}
    </div>
  );
}
