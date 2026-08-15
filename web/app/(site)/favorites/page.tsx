import type { Metadata } from "next";
import { getAllKimonos } from "@/lib/kimono-repository";
import { FavoritesView } from "@/components/FavoritesView";

export const metadata: Metadata = {
  title: "お気に入り",
  description: "お気に入りに登録した着物の一覧です。",
};

export default async function FavoritesPage() {
  const allKimonos = await getAllKimonos();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-serif text-3xl text-kon">お気に入り</h1>
      <FavoritesView allKimonos={allKimonos} />
    </div>
  );
}
