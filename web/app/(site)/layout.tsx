import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// 店舗フロント共通レイアウト（ヘッダー／フッター）
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
