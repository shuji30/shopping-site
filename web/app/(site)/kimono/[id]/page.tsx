import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getKimonoById } from "@/lib/kimono-repository";
import { getReservedRanges } from "@/lib/availability";
import { getReviewsByKimono, getReviewStats } from "@/lib/review-repository";
import { formatJP } from "@/lib/date";
import { KimonoImage } from "@/components/KimonoImage";
import { AddToCartForm } from "@/components/AddToCartForm";
import { FavoriteButton } from "@/components/FavoriteButton";
import { StarRating } from "@/components/StarRating";
import { ReviewForm } from "@/components/ReviewForm";

// 在庫（貸出中期間）を常に最新反映するため動的レンダリング
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const kimono = await getKimonoById(id);
  if (!kimono) return { title: "商品が見つかりません" };
  return { title: kimono.name, description: kimono.description };
}

export default async function KimonoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const kimono = await getKimonoById(id);
  if (!kimono) notFound();

  const reservedRanges = await getReservedRanges(kimono.id);
  const [reviews, reviewStats] = await Promise.all([
    getReviewsByKimono(kimono.id),
    getReviewStats(kimono.id),
  ]);

  const specs: { label: string; value: string }[] = [
    { label: "カテゴリ", value: kimono.categoryLabel },
    { label: "サイズ", value: kimono.sizes.join(" / ") },
    { label: "色", value: kimono.colors.join("・") },
    { label: "素材", value: kimono.material },
    { label: "レンタル期間", value: `${kimono.rentalDays}日間` },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="text-sm text-sumi/60">
        <Link href="/" className="hover:text-kon">
          ホーム
        </Link>
        <span className="mx-2">/</span>
        <Link href="/kimonos" className="hover:text-kon">
          商品一覧
        </Link>
        <span className="mx-2">/</span>
        <span className="text-sumi/80">{kimono.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        {/* 画像 */}
        <div>
          <KimonoImage
            seed={kimono.images[0] ?? kimono.id}
            motif={kimono.name.slice(0, 1)}
            className="aspect-[3/4] w-full rounded-lg"
          />
        </div>

        {/* 情報 */}
        <div>
          <span className="inline-block rounded bg-kon/90 px-3 py-1 text-xs text-washi">
            {kimono.categoryLabel}
          </span>
          <h1 className="mt-3 font-serif text-3xl leading-snug text-kon">
            {kimono.name}
          </h1>

          <p className="mt-4 text-2xl font-semibold text-kon">
            ¥{kimono.price.toLocaleString()}
            <span className="ml-1 text-sm font-normal text-sumi/60">
              / {kimono.rentalDays}日レンタル（税込）
            </span>
          </p>

          <p className="mt-2 text-sm">
            {kimono.inStock ? (
              <span className="text-enji">● レンタル可能</span>
            ) : (
              <span className="text-sumi/60">● 現在貸出中</span>
            )}
          </p>

          {/* 評価サマリ */}
          {reviewStats.count > 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <StarRating value={reviewStats.average} />
              <span className="font-medium text-sumi/90">
                {reviewStats.average.toFixed(1)}
              </span>
              <a
                href="#reviews"
                className="text-sumi/60 underline-offset-4 hover:underline"
              >
                （{reviewStats.count}件のレビュー）
              </a>
            </div>
          )}

          <p className="mt-6 leading-relaxed text-sumi/90">
            {kimono.description}
          </p>

          {/* スペック */}
          <dl className="mt-8 divide-y divide-kin/20 border-y border-kin/20">
            {specs.map((s) => (
              <div key={s.label} className="flex py-3 text-sm">
                <dt className="w-28 shrink-0 text-sumi/60">{s.label}</dt>
                <dd className="text-sumi/90">{s.value}</dd>
              </div>
            ))}
          </dl>

          {/* サイズ・レンタル開始日を選んでカートへ */}
          <AddToCartForm kimono={kimono} reservedRanges={reservedRanges} />

          <div className="mt-6">
            <FavoriteButton kimonoId={kimono.id} variant="inline" />
          </div>

          <div className="mt-8">
            <Link
              href="/kimonos"
              className="text-sm text-kon underline-offset-4 hover:underline"
            >
              ← 商品一覧に戻る
            </Link>
          </div>
        </div>
      </div>

      {/* レビュー */}
      <section id="reviews" className="mt-16 scroll-mt-24">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-serif text-2xl text-kon">レビュー</h2>
          {reviewStats.count > 0 && (
            <span className="flex items-center gap-2 text-sm text-sumi/80">
              <StarRating value={reviewStats.average} />
              {reviewStats.average.toFixed(1)}（{reviewStats.count}件）
            </span>
          )}
        </div>

        {reviews.length === 0 ? (
          <p className="mt-4 text-sm text-sumi/60">
            まだレビューはありません。最初のレビューを投稿してみませんか。
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {reviews.map((rv) => (
              <li
                key={rv.id}
                className="rounded-lg border border-kin/20 bg-white/60 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StarRating value={rv.rating} />
                    <span className="text-sm font-medium text-sumi/90">
                      {rv.name}
                    </span>
                  </div>
                  <span className="text-xs text-sumi/50">
                    {formatJP(rv.createdAt.toISOString().slice(0, 10))}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-sumi/90">
                  {rv.comment}
                </p>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 max-w-xl">
          <ReviewForm kimonoId={kimono.id} />
        </div>
      </section>
    </div>
  );
}
