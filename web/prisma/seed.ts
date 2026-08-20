// サンプル商品データを DB へ投入する。既存の data/kimonos.ts を唯一の情報源として利用。
// アダプタ選択（SQLite/Postgres/Turso）と安全な切断は lib/db.ts に委ねる。
import { prisma } from "../lib/db";
import { kimonos } from "../data/kimonos";
import { initialCategories } from "../data/categories";

async function main() {
  // カテゴリマスタ（管理画面から編集されるので、既存行は上書きしない）
  for (const c of initialCategories) {
    await prisma.category.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        label: c.label,
        description: c.description,
        sortOrder: c.sortOrder,
      },
    });
  }

  for (const k of kimonos) {
    await prisma.kimono.upsert({
      where: { id: k.id },
      update: {},
      create: {
        id: k.id,
        name: k.name,
        category: k.category,
        price: k.price,
        rentalDays: k.rentalDays,
        sizes: JSON.stringify(k.sizes),
        colors: JSON.stringify(k.colors),
        images: JSON.stringify(k.images),
        material: k.material,
        description: k.description,
        inStock: k.inStock,
        featured: k.featured ?? false,
      },
    });
  }
  const [count, categoryCount] = await Promise.all([
    prisma.kimono.count(),
    prisma.category.count(),
  ]);
  console.log(`seeded: ${count} kimonos, ${categoryCount} categories`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
