import Link from "next/link";
import { CartButton } from "./CartButton";

/** サイト共通ヘッダー（ブランド＋グローバルナビ） */
export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-kin/30 bg-washi/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-serif text-2xl font-semibold tracking-wide text-kon">
            雅
          </span>
          <span className="text-[0.7rem] tracking-[0.3em] text-sumi/60">
            KIMONO RENTAL
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link
            href="/"
            className="text-sumi/80 transition-colors hover:text-kon"
          >
            ホーム
          </Link>
          <Link
            href="/kimonos"
            className="text-sumi/80 transition-colors hover:text-kon"
          >
            商品一覧
          </Link>
          <CartButton />
        </nav>
      </div>
    </header>
  );
}
