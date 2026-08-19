// サンプル商品データを DB へ投入する。既存の data/kimonos.ts を唯一の情報源として利用。
// アダプタ選択（SQLite/Postgres/Turso）と安全な切断は lib/db.ts に委ねる。
import { prisma } from "../lib/db";
import { kimonos } from "../data/kimonos";

async function main() {
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
  const count = await prisma.kimono.count();
  console.log(`seeded: ${count} kimonos`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
