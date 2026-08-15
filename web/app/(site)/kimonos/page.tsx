import type { Metadata } from "next";
import { getAllKimonos, getKimonosByCategory } from "@/lib/kimono-repository";
import { categories, getCategoryLabel } from "@/lib/categories";
import { applyKimonoQuery, isSortId } from "@/lib/kimono-filter";
import { ProductCard } from "@/components/ProductCard";
import { KimonoFilters } from "@/components/KimonoFilters";

export const metadata: Metadata = {
  title: "商品一覧",
  description: "レンタル可能な着物の一覧。カテゴリ・キーワード・料金で絞り込めます。",
};

export default async function KimonosPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; sort?: string }>;
}) {
  const { category, q, sort } = await searchParams;
  const active = categories.find((c) => c.id === category)?.id;
  const sortId = sort && isSortId(sort) ? sort : "recommended";
  const keyword = q ?? "";

  const base = active
    ? await getKimonosByCategory(active)
    : await getAllKimonos();
  const items = applyKimonoQuery(base, { q: keyword, sort: sortId });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-serif text-3xl text-kon">商品一覧</h1>

      {/* カテゴリ・検索・並び替え */}
      <KimonoFilters active={active} q={keyword} sort={sortId} />

      <p className="mt-4 text-sm text-sumi/60">
        {items.length}件
        {active ? `（${getCategoryLabel(active)}）` : ""}
        {keyword ? `／「${keyword}」の検索結果` : ""}
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
