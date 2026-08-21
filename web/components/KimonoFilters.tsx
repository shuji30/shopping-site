"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sortOptions } from "@/lib/kimono-filter";
import type { KimonoCategory } from "@/lib/types";

interface Props {
  /** DB から取得したカテゴリマスタ（表示順で並んでいる） */
  categories: KimonoCategory[];
  active?: string;
  q: string;
  sort: string;
}

/** 商品一覧のカテゴリ絞り込み・キーワード検索・並び替えコントロール */
export function KimonoFilters({ categories, active, q, sort }: Props) {
  const router = useRouter();
  const [text, setText] = useState(q);

  // 現在の条件をベースに、指定分だけ上書きして URL を更新する
  function navigate(next: {
    category?: string | null;
    q?: string;
    sort?: string;
  }) {
    const params = new URLSearchParams();
    const category = next.category !== undefined ? next.category : active;
    const query = next.q !== undefined ? next.q : text;
    const sortId = next.sort !== undefined ? next.sort : sort;
    if (category) params.set("category", category);
    if (query.trim()) params.set("q", query.trim());
    if (sortId && sortId !== "recommended") params.set("sort", sortId);
    const qs = params.toString();
    router.push(qs ? `/kimonos?${qs}` : "/kimonos");
  }

  function chipClass(isActive: boolean): string {
    return isActive
      ? "rounded-full bg-kon px-4 py-1.5 text-sm text-washi"
      : "rounded-full border border-kin/40 px-4 py-1.5 text-sm text-sumi/80 transition hover:border-kin hover:text-kon";
  }

  return (
    <div className="mt-6 space-y-4">
      {/* カテゴリ絞り込み */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => navigate({ category: null })}
          className={chipClass(!active)}
        >
          すべて
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => navigate({ category: c.id })}
            className={chipClass(active === c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* 検索＋並び替え */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ q: text });
          }}
          className="flex w-full max-w-md gap-2"
          role="search"
        >
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="キーワード（名前・色・素材など）"
            aria-label="商品を検索"
            className="w-full rounded-md border border-kin/40 bg-white/70 px-3 py-2 text-sm text-sumi focus:border-kon focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 rounded-md bg-kon px-4 py-2 text-sm text-washi transition hover:bg-kon-light"
          >
            検索
          </button>
        </form>

        <label className="flex items-center gap-2 text-sm text-sumi/70">
          並び替え
          <select
            value={sort}
            onChange={(e) => navigate({ sort: e.target.value })}
            className="rounded-md border border-kin/40 bg-white/70 px-3 py-2 text-sm text-sumi focus:border-kon focus:outline-none"
          >
            {sortOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
