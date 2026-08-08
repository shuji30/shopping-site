import Link from "next/link";
import { getFeaturedKimonos } from "@/data/kimonos";
import { categories } from "@/lib/categories";
import { ProductCard } from "@/components/ProductCard";

export default function Home() {
  const featured = getFeaturedKimonos();

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
          <p className="text-sm tracking-[0.3em] text-kin">KIMONO RENTAL 雅</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">
            晴れの日を、
            <br />
            美しい一枚とともに。
          </h1>
          <p className="mt-6 max-w-md leading-relaxed text-washi/80">
            振袖・訪問着・卒業袴・浴衣を、ネットで手軽にレンタル。
            サイズや柄からお気に入りの一枚をお選びいただけます。
          </p>
          <Link
            href="/kimonos"
            className="mt-8 inline-block rounded-full bg-kin px-8 py-3 text-sm font-medium text-sumi transition hover:bg-kin/90"
          >
            商品を見る
          </Link>
        </div>
      </section>

      {/* カテゴリ */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-serif text-2xl text-kon">カテゴリから探す</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/kimonos?category=${c.id}`}
              className="rounded-lg border border-kin/20 bg-white/60 px-4 py-6 text-center transition hover:border-kin hover:shadow-sm"
            >
              <span className="font-serif text-lg text-sumi">{c.label}</span>
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
    </>
  );
}
