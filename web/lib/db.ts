// Next.js（next dev/build）は .env を自動で読み込むが、seed/e2e等の素の
// tsx スクリプトから直接importされた場合は読み込まれない。dotenv/config は
// 既に process.env に値がある変数を上書きしないため、両方の起動経路で安全に動く。
import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 は SQLite/Postgres いずれもドライバアダプタが必要。
// DATABASE_URL のスキームでアダプタを自動選択する。
//   - postgres:// | postgresql://  → PrismaPg（本番想定・Cloud SQL等）
//   - libsql:// | file: など        → PrismaLibSql（SQLite・開発／Turso本番）
//
// 本番でTurso（libSQL）を使う場合は DATABASE_URL に libsql://... を設定し、
// 認証トークンを TURSO_AUTH_TOKEN に設定する（docs/DEPLOY-GCP.md 参照）。
// 本番 Postgres（Cloud SQL）へ切り替える手順は docs/DEPLOYMENT.md を参照。
// （schema.prisma の provider を postgresql にして再マイグレーション/再生成が必要）
const url = process.env.DATABASE_URL ?? "file:./dev.db";

function createAdapter() {
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return new PrismaPg({ connectionString: url });
  }
  const authToken = process.env.TURSO_AUTH_TOKEN;
  return new PrismaLibSql(authToken ? { url, authToken } : { url });
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
