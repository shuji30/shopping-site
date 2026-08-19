import type { Metadata } from "next";
import { getAllKimonos, getKimonosByCategory } from "@/lib/kimono-repository";
import { categories, getCategoryLabel } from "@/lib/categories";
import {
  applyKimonoQuery,
  countPages,
  isSortId,
  paginate,
  parsePage,
} from "@/lib/kimono-filter";
import { ProductCard } from "@/components/ProductCard";
import { KimonoFilters } from "@/components/KimonoFilters";
import { Pagination } from "@/components/Pagination";

export const metadata: Metadata = {
  title: "商品一覧",
  description: "レンタル可能な着物の一覧。カテゴリ・キーワード・料金で絞り込めます。",
};

export default async function KimonosPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    q?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { category, q, sort, page } = await searchParams;
  const active = categories.find((c) => c.id === category)?.id;
  const sortId = sort && isSortId(sort) ? sort : "recommended";
  const keyword = q ?? "";

  const base = active
    ? await getKimonosByCategory(active)
    : await getAllKimonos();
  const matched = applyKimonoQuery(base, { q: keyword, sort: sortId });
  const paged = paginate(matched, parsePage(page, countPages(matched.length)));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-serif text-3xl text-kon">商品一覧</h1>

      {/* カテゴリ・検索・並び替え */}
      <KimonoFilters active={active} q={keyword} sort={sortId} />

      <p className="mt-4 text-sm text-sumi/60">
        {paged.total}件
        {active ? `（${getCategoryLabel(active)}）` : ""}
        {keyword ? `／「${keyword}」の検索結果` : ""}
        {paged.totalPages > 1
          ? `／${paged.page} / ${paged.totalPages} ページ`
          : ""}
      </p>

      {paged.total === 0 ? (
        <p className="mt-16 text-center text-sumi/60">
          該当する商品が見つかりませんでした。
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {paged.items.map((k) => (
              <ProductCard key={k.id} kimono={k} />
            ))}
          </div>
          <Pagination
            page={paged.page}
            totalPages={paged.totalPages}
            params={{ category: active, q: keyword, sort: sortId }}
          />
        </>
      )}
    </div>
  );
}
