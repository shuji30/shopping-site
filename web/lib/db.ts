import { PrismaClient } from "./generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// Prisma 7 は SQLite にドライバアダプタが必要。libSQL アダプタを使用。
// DATABASE_URL は cwd（web/）基準の相対パス（例: file:./dev.db → web/dev.db）。
const url = process.env.DATABASE_URL ?? "file:./dev.db";

const adapter = new PrismaLibSql({ url });

// 開発時の HMR で接続が増えないよう、グローバルに使い回す。
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
