import Link from "next/link";

/** サイト共通フッター */
export function Footer() {
  return (
    <footer className="mt-16 border-t border-kin/30 bg-washi-dark">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-sumi/70">
        <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
          <div>
            <p className="font-serif text-lg text-kon">きものレンタル 雅</p>
            <p className="mt-2 max-w-sm leading-relaxed">
              晴れの日を彩る着物を、ネットで手軽にレンタル。振袖・訪問着・卒業袴・浴衣まで取り揃えています。
            </p>
          </div>
          <nav className="flex flex-col gap-2">
            <Link href="/" className="transition-colors hover:text-kon">
              ホーム
            </Link>
            <Link href="/kimonos" className="transition-colors hover:text-kon">
              商品一覧
            </Link>
            <Link href="/orders" className="transition-colors hover:text-kon">
              予約照会
            </Link>
            <Link href="/legal" className="transition-colors hover:text-kon">
              特定商取引法に基づく表記
            </Link>
          </nav>
        </div>
        <p className="mt-8 text-xs text-sumi/50">
          © 2026 きものレンタル 雅 — これはサンプルサイトです。
        </p>
      </div>
    </footer>
  );
}
