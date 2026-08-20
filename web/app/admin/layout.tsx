import Link from "next/link";
import { appVersion } from "@/lib/version";

// 管理画面共通レイアウト（店舗フロントとは別のヘッダー）
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-kon text-washi">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="font-serif text-lg">
            雅 <span className="text-sm font-normal text-washi/70">管理画面</span>
          </Link>
          <nav className="flex gap-5 text-sm">
            <Link href="/admin" className="transition hover:text-kin">
              ダッシュボード
            </Link>
            <Link
              href="/admin/reservations"
              className="transition hover:text-kin"
            >
              予約一覧
            </Link>
            <Link href="/admin/reviews" className="transition hover:text-kin">
              レビュー管理
            </Link>
            <Link
              href="/admin/categories"
              className="transition hover:text-kin"
            >
              カテゴリ管理
            </Link>
            <Link href="/" className="text-washi/70 transition hover:text-kin">
              サイトへ →
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-kin/20 bg-washi-dark px-4 py-3 text-center text-xs text-sumi/50">
        雅 管理画面 v{appVersion}
      </footer>
    </div>
  );
}
