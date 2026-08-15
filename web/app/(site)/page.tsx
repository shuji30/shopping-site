import Link from "next/link";
import { getFeaturedKimonos } from "@/lib/kimono-repository";
import { categories } from "@/lib/categories";
import { ProductCard } from "@/components/ProductCard";

export default async function Home() {
  const featured = await getFeaturedKimonos();

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

      {/* ご利用の流れ */}
      <section className="bg-washi-dark/50">
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

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h2 className="font-serif text-3xl text-kon">
          特別な一日に、特別な一枚を。
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-sumi/70">
          豊富な品揃えから、あなたにぴったりの着物を見つけてください。
        </p>
        <Link
          href="/kimonos"
          className="mt-8 inline-block rounded-full bg-kon px-8 py-3 text-sm font-medium text-washi transition hover:bg-kon-light"
        >
          着物を探す
        </Link>
      </section>
    </>
  );
}

// トップページの静的コンテンツ
const features = [
  {
    icon: "🚚",
    title: "全国どこでも配送",
    body: "ご自宅までお届け。返却も同梱の伝票で送るだけ。店頭受取もお選びいただけます。",
  },
  {
    icon: "👘",
    title: "豊富なサイズ・柄",
    body: "振袖から浴衣まで、S〜Lの幅広いサイズと季節の柄を取り揃えています。",
  },
  {
    icon: "✨",
    title: "安心のクリーニング",
    body: "専門スタッフによる仕上げでいつも清潔。万一の汚れも安心保証つき（サンプル）。",
  },
];

const steps = [
  { title: "選ぶ", body: "お好みの着物・サイズ・レンタル開始日を選んでカートに入れます。" },
  { title: "予約する", body: "お客様情報を入力してお申し込み。受付番号が発行されます。" },
  { title: "受け取る", body: "開始日に合わせて配送、または店頭でお受け取りください。" },
  { title: "返却する", body: "ご利用後は同梱の伝票で返送するだけ。面倒な手間はありません。" },
];
