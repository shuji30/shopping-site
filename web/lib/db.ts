import { PrismaClient } from "./generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 は SQLite/Postgres いずれもドライバアダプタが必要。
// DATABASE_URL のスキームでアダプタを自動選択する。
//   - postgres:// | postgresql://  → PrismaPg（本番想定）
//   - file: など                    → PrismaLibSql（SQLite・開発）
//
// 本番 Postgres へ切り替える手順は docs/DEPLOYMENT.md を参照。
// （schema.prisma の provider を postgresql にして再マイグレーション/再生成が必要）
const url = process.env.DATABASE_URL ?? "file:./dev.db";

function createAdapter() {
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return new PrismaPg({ connectionString: url });
  }
  return new PrismaLibSql({ url });
}

// 開発時の HMR で接続が増えないよう、グローバルに使い回す。
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: createAdapter() });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
