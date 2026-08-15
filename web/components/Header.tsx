import Link from "next/link";
import { CartButton } from "./CartButton";
import { FavoritesButton } from "./FavoritesButton";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";

/** サイト共通ヘッダー（ブランド＋グローバルナビ＋ログイン状態） */
export async function Header() {
  const user = await getCurrentUser();

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
        <nav className="flex items-center gap-5 text-sm">
          <Link
            href="/kimonos"
            className="text-sumi/80 transition-colors hover:text-kon"
          >
            商品一覧
          </Link>
          {user ? (
            <>
              <Link
                href="/mypage"
                className="text-sumi/80 transition-colors hover:text-kon"
              >
                マイページ
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="text-sumi/60 transition-colors hover:text-kon"
                >
                  ログアウト
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sumi/80 transition-colors hover:text-kon"
            >
              ログイン
            </Link>
          )}
          <FavoritesButton />
          <CartButton />
        </nav>
      </div>
    </header>
  );
}
