import "server-only";
import { prisma } from "./db";
import { getCategoryLabelMap } from "./category-repository";
import type { Kimono, KimonoCategoryId } from "./types";

// DB の行を、アプリのドメイン型 Kimono に変換する。
// sizes/colors/images は SQLite に JSON 文字列で保存しているためパースする。
type KimonoRow = {
  id: string;
  name: string;
  category: string;
  price: number;
  rentalDays: number;
  sizes: string;
  colors: string;
  images: string;
  material: string;
  description: string;
  inStock: boolean;
  featured: boolean;
};

// カテゴリ表示名は Category マスタから引いて埋める。マスタに無い識別子
// （カテゴリ削除後の商品など）は識別子をそのまま表示して、空欄にしない。
function toDomain(row: KimonoRow, labels: Map<string, string>): Kimono {
  return {
    id: row.id,
    name: row.name,
    category: row.category as KimonoCategoryId,
    categoryLabel: labels.get(row.category) ?? row.category,
    price: row.price,
    rentalDays: row.rentalDays,
    sizes: JSON.parse(row.sizes) as string[],
    colors: JSON.parse(row.colors) as string[],
    images: JSON.parse(row.images) as string[],
    material: row.material,
    description: row.description,
    inStock: row.inStock,
    featured: row.featured,
  };
}

export async function getAllKimonos(): Promise<Kimono[]> {
  const [rows, labels] = await Promise.all([
    prisma.kimono.findMany({ orderBy: { createdAt: "asc" } }),
    getCategoryLabelMap(),
  ]);
  return rows.map((r) => toDomain(r, labels));
}

export async function getKimonoById(id: string): Promise<Kimono | null> {
  const [row, labels] = await Promise.all([
    prisma.kimono.findUnique({ where: { id } }),
    getCategoryLabelMap(),
  ]);
  return row ? toDomain(row, labels) : null;
}

export async function getFeaturedKimonos(): Promise<Kimono[]> {
  const [rows, labels] = await Promise.all([
    prisma.kimono.findMany({
      where: { featured: true },
      orderBy: { createdAt: "asc" },
    }),
    getCategoryLabelMap(),
  ]);
  return rows.map((r) => toDomain(r, labels));
}

export async function getKimonosByCategory(
  category: KimonoCategoryId,
): Promise<Kimono[]> {
  const [rows, labels] = await Promise.all([
    prisma.kimono.findMany({
      where: { category },
      orderBy: { createdAt: "asc" },
    }),
    getCategoryLabelMap(),
  ]);
  return rows.map((r) => toDomain(r, labels));
}

/** 静的生成（generateStaticParams）用に ID 一覧を取得 */
export async function getAllKimonoIds(): Promise<string[]> {
  const rows = await prisma.kimono.findMany({ select: { id: true } });
  return rows.map((r) => r.id);
}

/** その商品が予約明細で使われている件数（削除可否の判定に使う） */
export async function countReservationItemsForKimono(
  kimonoId: string,
): Promise<number> {
  return prisma.reservationItem.count({ where: { kimonoId } });
}
