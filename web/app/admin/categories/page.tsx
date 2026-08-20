import type { Metadata } from "next";
import { getCategories } from "@/lib/category-repository";
import { nextSortOrder } from "@/lib/categories";
import { prisma } from "@/lib/db";
import {
  CategoryManager,
  type CategoryWithCount,
} from "@/components/CategoryManager";

export const metadata: Metadata = { title: "カテゴリ管理（管理）" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await getCategories();

  // カテゴリごとの商品数（削除可否の判断に使う）。
  // 件数分クエリを投げず、groupBy で1回にまとめる。
  const grouped = await prisma.kimono.groupBy({
    by: ["category"],
    _count: { _all: true },
  });
  const counts = new Map(grouped.map((g) => [g.category, g._count._all]));

  const rows: CategoryWithCount[] = categories.map((c) => ({
    ...c,
    kimonoCount: counts.get(c.id) ?? 0,
  }));

  // マスタから消えた識別子が商品に残っていないか（データの取りこぼしを可視化する）
  const orphanIds = [...counts.keys()].filter(
    (id) => !categories.some((c) => c.id === id),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-serif text-2xl text-kon">カテゴリ管理</h1>
      <p className="mt-1 text-sm text-sumi/60">
        {categories.length}件。商品一覧の絞り込みとトップページの導線に使われます。
      </p>

      {orphanIds.length > 0 && (
        <p className="mt-4 rounded-md bg-enji/10 px-4 py-3 text-sm text-enji">
          マスタに無いカテゴリが商品に設定されています:{" "}
          <span className="font-mono">{orphanIds.join(", ")}</span>
          。該当商品のカテゴリを設定し直すか、同じ識別子でカテゴリを登録してください。
        </p>
      )}

      <div className="mt-6">
        <CategoryManager
          categories={rows}
          nextOrder={nextSortOrder(categories)}
        />
      </div>
    </div>
  );
}
