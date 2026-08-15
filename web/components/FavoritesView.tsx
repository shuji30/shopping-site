"use client";

import Link from "next/link";
import type { Kimono } from "@/lib/types";
import { useFavorites } from "@/lib/favorites";
import { ProductCard } from "@/components/ProductCard";

/**
 * お気に入り一覧の表示。お気に入りID（localStorage）と、サーバーから渡された
 * 全商品を突き合わせて表示する。並び順はお気に入り登録順を保つ。
 */
export function FavoritesView({ allKimonos }: { allKimonos: Kimono[] }) {
  const { ids, ready } = useFavorites();

  if (!ready) {
    return <p className="mt-8 text-sm text-sumi/60">読み込み中...</p>;
  }

  const byId = new Map(allKimonos.map((k) => [k.id, k]));
  const items = ids
    .map((id) => byId.get(id))
    .filter((k): k is Kimono => Boolean(k));

  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-lg border border-kin/20 bg-white/60 px-6 py-16 text-center">
        <p className="text-sumi/70">お気に入りに登録された着物はまだありません。</p>
        <p className="mt-1 text-sm text-sumi/50">
          気になる着物のハート♡を押すと、ここに追加されます。
        </p>
        <Link
          href="/kimonos"
          className="mt-4 inline-block rounded-full bg-kon px-6 py-2.5 text-sm text-washi transition hover:bg-kon-light"
        >
          着物を探す
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="mt-4 text-sm text-sumi/60">{items.length}件</p>
      <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((k) => (
          <ProductCard key={k.id} kimono={k} />
        ))}
      </div>
    </>
  );
}
