import Link from "next/link";
import { getAllKimonos, getFeaturedKimonos } from "@/lib/kimono-repository";
import { ProductCard } from "@/components/ProductCard";
import { getLatestReviews } from "@/lib/review-repository";
import { StarRating } from "@/components/StarRating";
import { formatJP } from "@/lib/date";
import {
  fillCatalogNote,
  formatDaysRange,
  formatPriceRange,
  summarizeCatalog,
} from "@/lib/catalog-summary";
import {
  assurances,
  closingCta,
  features,
  hero,
  scenes,
  steps,
} from "@/data/home-content";

export default async function Home() {
  const [featured, latestReviews, all] = await Promise.all([
    getFeaturedKimonos(),
    getLatestReviews(3),
    getAllKimonos(),
  ]);
  // 金額・レンタル日数は実データから出す（文言に埋め込むと商品追加で嘘になるため）
  const summary = summarizeCatalog(all);

  return (
    <>
      {/* ヒーロー */}
      <section className="relative overflow-hidden bg-kon text-washi">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-20"
          aria-hidden
        >
          <defs>
            <pattern
              id="hero-wave"
              width="60"
              height="30"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M0 30 A30 30 0 0 1 60 30"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-wave)" />
        </svg>
        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
          <p className="text-sm tracking-[0.3em] text-kin">{hero.eyebrow}</p>
          {/* スマホでは text-4xl だと「美しい一枚とともに。」が3行に折れるため1段落とす */}
          <h1 className="mt-4 font-serif text-3xl leading-tight sm:text-5xl">
            {hero.title[0]}
            <br />
            {hero.title[1]}
          </h1>
          <p className="mt-6 max-w-md leading-relaxed text-washi/80">
            {hero.lead}
          </p>

          {/* 料金とレンタル日数を最初の画面で見せる（申込前の不安を減らす） */}
          {summary && (
            <p className="mt-6 text-sm text-washi/90">
              レンタル料{" "}
              <span className="font-semibold text-kin">
                {formatPriceRange(summary.minPrice, summary.maxPrice)}
              </span>
              <span className="mx-2 text-washi/40">|</span>
              ご利用{" "}
              <span className="font-semibold text-kin">
                {formatDaysRange(summary.minDays, summary.maxDays)}
              </span>
              <span className="mx-2 text-washi/40">|</span>
              往復送料込み（サンプル）
            </p>
          )}

          {/* スマホでは縦積み＋全幅にして押しやすくする */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={hero.primaryCta.href}
              className="rounded-full bg-kin px-8 py-3 text-center text-sm font-medium text-sumi transition hover:bg-kin/90"
            >
              {hero.primaryCta.label}
            </Link>
            <Link
              href={hero.secondaryCta.href}
              className="rounded-full border border-washi/40 px-8 py-3 text-center text-sm font-medium text-washi transition hover:border-washi hover:bg-washi/10"
            >
              {hero.secondaryCta.label}
            </Link>
          </div>
        </div>
      </section>

      {/* 安心材料（ヒーロー直下） */}
      <section className="border-b border-kin/20 bg-white/50">
        <dl className="mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:grid-cols-3">
          {assurances.map((a) => (
            <div key={a.label} className="text-sm">
              <dt className="text-xs font-medium tracking-wide text-kon">
                {a.label}
              </dt>
              <dd className="mt-1 leading-relaxed text-sumi/70">{a.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* シーンから探す（旧「カテゴリから探す」。利用シーンを主語にして選びやすくする） */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-serif text-2xl text-kon">シーンから探す</h2>
        <p className="mt-2 text-sm text-sumi/60">
          お使いになる場面から、ふさわしい着物をお選びいただけます。
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {scenes.map((s) => (
            <Link
              key={s.category}
              href={`/kimonos?category=${s.category}`}
              className="rounded-lg border border-kin/20 bg-white/60 p-5 transition hover:border-kin hover:shadow-sm"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-serif text-lg text-sumi">{s.scene}</span>
                <span className="shrink-0 rounded-full bg-kon/10 px-2.5 py-0.5 text-xs text-kon">
                  {s.categoryLabel}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-sumi/70">
                {s.note}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* 注目商品 */}
      <section className="mx-auto max-w-6xl px-4 pb-8">
        <div className="flex items-end justify-between">
          <h2 className="font-serif text-2xl text-kon">注目の着物</h2>
          <Link
            href="/kimonos"
            className="text-sm text-kon underline-offset-4 hover:underline"
          >
            すべて見る →
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((k) => (
            <ProductCard key={k.id} kimono={k} />
          ))}
        </div>
      </section>

      {/* 選ばれる理由 */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center font-serif text-2xl text-kon">
          雅が選ばれる理由
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-kin/20 bg-white/60 p-6 text-center"
            >
              <p className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-kon/10 text-2xl">
                {f.icon}
              </p>
              <h3 className="mt-4 font-serif text-lg text-kon">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-sumi/70">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ご利用の流れ（ヒーローの副CTAのリンク先） */}
      <section id="flow" className="scroll-mt-16 bg-washi-dark/50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center font-serif text-2xl text-kon">
            ご利用の流れ
          </h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className="relative rounded-lg border border-kin/20 bg-white/70 p-6"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-kon font-serif text-sm text-washi">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-serif text-lg text-kon">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-sumi/70">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* お客様の声（申し込みを促す直前に置く） */}
      {latestReviews.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center font-serif text-2xl text-kon">
            お客様の声
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {latestReviews.map((rv) => (
              <Link
                key={rv.id}
                href={`/kimono/${rv.kimonoId}#reviews`}
                className="rounded-lg border border-kin/20 bg-white/60 p-6 transition hover:border-kin hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <StarRating value={rv.rating} />
                  <span className="text-xs text-sumi/50">
                    {formatJP(rv.createdAt.toISOString().slice(0, 10))}
                  </span>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-sumi/90">
                  {rv.comment}
                </p>
                <p className="mt-4 text-xs text-sumi/60">
                  {rv.name} 様 ・ {rv.kimonoName}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h2 className="font-serif text-3xl text-kon">{closingCta.title}</h2>
        <p className="mt-4 text-sm leading-relaxed text-sumi/70">
          {closingCta.lead}
        </p>
        {summary && (
          <p className="mt-2 text-sm text-sumi/60">
            {fillCatalogNote(closingCta.noteTemplate, summary)}
          </p>
        )}
        <Link
          href={closingCta.cta.href}
          className="mt-8 inline-block rounded-full bg-kon px-8 py-3 text-sm font-medium text-washi transition hover:bg-kon-light"
        >
          {closingCta.cta.label}
        </Link>
      </section>
    </>
  );
}
