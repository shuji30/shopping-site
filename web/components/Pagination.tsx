import Link from "next/link";
import { pageWindow } from "@/lib/kimono-filter";

interface Props {
  page: number;
  totalPages: number;
  /** ページ以外の検索条件。ページ移動しても維持する */
  params: { category?: string; q?: string; sort?: string };
  /** リンク先のパス（既定は商品一覧） */
  basePath?: string;
}

/** ページ番号リンク。1ページしか無いときは何も描画しない */
export function Pagination({ page, totalPages, params, basePath = "/kimonos" }: Props) {
  if (totalPages <= 1) return null;

  function href(target: number): string {
    const qs = new URLSearchParams();
    if (params.category) qs.set("category", params.category);
    if (params.q) qs.set("q", params.q);
    if (params.sort && params.sort !== "recommended") qs.set("sort", params.sort);
    // 1ページ目は既定なので付けない（同じ内容のURLを2種類作らないため）
    if (target > 1) qs.set("page", String(target));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  }

  const numberClass = "rounded-md border border-kin/40 px-3 py-1.5 text-sm text-sumi/80 transition hover:border-kin hover:text-kon";
  const currentClass = "rounded-md bg-kon px-3 py-1.5 text-sm text-washi";
  const edgeClass = "rounded-md border border-kin/40 px-3 py-1.5 text-sm text-sumi/80 transition hover:border-kin hover:text-kon";
  const edgeDisabledClass = "rounded-md border border-kin/20 px-3 py-1.5 text-sm text-sumi/30";

  return (
    <nav className="mt-10 flex items-center justify-center gap-2" aria-label="ページ送り">
      {page > 1 ? (
        <Link href={href(page - 1)} className={edgeClass} rel="prev">
          前へ
        </Link>
      ) : (
        <span className={edgeDisabledClass} aria-disabled="true">
          前へ
        </span>
      )}

      {pageWindow(page, totalPages).map((n) => (
        <Link
          key={n}
          href={href(n)}
          className={n === page ? currentClass : numberClass}
          aria-current={n === page ? "page" : undefined}
        >
          {n}
        </Link>
      ))}

      {page < totalPages ? (
        <Link href={href(page + 1)} className={edgeClass} rel="next">
          次へ
        </Link>
      ) : (
        <span className={edgeDisabledClass} aria-disabled="true">
          次へ
        </span>
      )}
    </nav>
  );
}
