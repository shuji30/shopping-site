import Link from "next/link";
import type { Kimono } from "@/lib/types";
import { getCategoryLabel } from "@/lib/categories";
import { KimonoImage } from "./KimonoImage";

/** 商品一覧・注目商品で使う商品カード */
export function ProductCard({ kimono }: { kimono: Kimono }) {
  return (
    <Link
      href={`/kimono/${kimono.id}`}
      className="group block overflow-hidden rounded-lg border border-kin/20 bg-white/60 shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <KimonoImage
          seed={kimono.images[0] ?? kimono.id}
          motif={kimono.name.slice(0, 1)}
          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute right-2 top-2 rounded bg-kon/90 px-2 py-1 text-xs text-washi">
          {getCategoryLabel(kimono.category)}
        </span>
        {!kimono.inStock && (
          <span className="absolute left-2 top-2 rounded bg-sumi/80 px-2 py-1 text-xs text-washi">
            貸出中
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-serif text-base leading-snug text-sumi transition-colors group-hover:text-kon">
          {kimono.name}
        </h3>
        <div className="mt-2 flex items-baseline justify-between">
          <p className="text-kon">
            <span className="text-lg font-semibold">
              ¥{kimono.price.toLocaleString()}
            </span>
            <span className="ml-1 text-xs text-sumi/60">
              / {kimono.rentalDays}日
            </span>
          </p>
          <p className="text-xs text-sumi/60">{kimono.sizes.join(" / ")}</p>
        </div>
      </div>
    </Link>
  );
}
