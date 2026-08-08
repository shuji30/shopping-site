import "server-only";
import { prisma } from "./db";
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

function toDomain(row: KimonoRow): Kimono {
  return {
    id: row.id,
    name: row.name,
    category: row.category as KimonoCategoryId,
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
  const rows = await prisma.kimono.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toDomain);
}

export async function getKimonoById(id: string): Promise<Kimono | null> {
  const row = await prisma.kimono.findUnique({ where: { id } });
  return row ? toDomain(row) : null;
}

export async function getFeaturedKimonos(): Promise<Kimono[]> {
  const rows = await prisma.kimono.findMany({
    where: { featured: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toDomain);
}

export async function getKimonosByCategory(
  category: KimonoCategoryId,
): Promise<Kimono[]> {
  const rows = await prisma.kimono.findMany({
    where: { category },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toDomain);
}

/** 静的生成（generateStaticParams）用に ID 一覧を取得 */
export async function getAllKimonoIds(): Promise<string[]> {
  const rows = await prisma.kimono.findMany({ select: { id: true } });
  return rows.map((r) => r.id);
}
