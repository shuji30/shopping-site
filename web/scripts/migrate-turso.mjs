// 本番DB（Turso）へ Prisma のマイグレーションを適用する（loop 74）。
//
// CD（.github/workflows/deploy.yml）から `gcloud run deploy` の**前**に実行し、
// 失敗したら（非0で終了して）デプロイを中止する。壊れたコードを本番に出さないため。
//
// なぜ prisma migrate deploy を使わないか:
//   Prisma は `libsql://` を扱えない。Turso の HTTP API（/v2/pipeline）を直接叩く。
//   turso CLI も不要（curl 相当の fetch だけで完結する）。
//
// 適用済みの管理:
//   `_applied_migrations`（このスクリプト専用の台帳）に名前を記録する。
//   Prisma の `_prisma_migrations` とは別物で、互換性も持たせていない。
//
// 使い方:
//   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... node scripts/migrate-turso.mjs
//   オプション:
//     --dry-run                 何を適用するかだけ表示して終了する
//     --baseline <migration名>  台帳が空のときだけ有効。その名前まで（含む）を
//                               「実行せずに適用済みとして記録」する。すでに手作業で
//                               適用済みのDBを、この仕組みに載せるための初回専用。
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveBaseline,
  selectPending,
  splitSqlStatements,
  toHttpUrl,
} from "../lib/migration-sql.ts";

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "prisma",
  "migrations",
);
const LEDGER = "_applied_migrations";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const baselineIndex = args.indexOf("--baseline");
const baseline = baselineIndex >= 0 ? args[baselineIndex + 1] : undefined;

const url = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_AUTH_TOKEN;
if (!url || !token) {
  console.error(
    "TURSO_DATABASE_URL と TURSO_AUTH_TOKEN が必要です。\n" +
      "GitHub Actions では Settings → Secrets and variables → Actions に登録してください。",
  );
  process.exit(1);
}

const endpoint = `${toHttpUrl(url)}/v2/pipeline`;

/** SQL を1文ずつ順に実行する。1つでも失敗したら例外を投げる */
async function execute(statements) {
  const requests = statements.map((sql) => ({ type: "execute", stmt: { sql } }));
  requests.push({ type: "close" });

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${await res.text()}`);
  }
  const body = await res.json();
  const results = body.results ?? [];
  results.forEach((r, i) => {
    if (r.type === "error") {
      const message = r.error?.message ?? JSON.stringify(r.error);
      throw new Error(`SQL失敗 [${i}]: ${message}\n  ${statements[i]}`);
    }
  });
  return results;
}

/** 1文だけ実行して行を返す */
async function query(sql) {
  const [result] = await execute([sql]);
  const rows = result.response?.result?.rows ?? [];
  return rows.map((row) => row.map((cell) => cell?.value ?? null));
}

async function main() {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  const all = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  if (all.length === 0) throw new Error("マイグレーションが1件もありません");

  await execute([
    `CREATE TABLE IF NOT EXISTS ${LEDGER} (name TEXT NOT NULL PRIMARY KEY, appliedAt TEXT NOT NULL)`,
  ]);
  const applied = (await query(`SELECT name FROM ${LEDGER}`)).map((r) => r[0]);
  console.log(`台帳に記録済み: ${applied.length}件 / マイグレーション総数: ${all.length}件`);

  // すでに手作業で適用済みのDBを、この仕組みに載せるための初回処理
  if (applied.length === 0) {
    if (!baseline) {
      throw new Error(
        `台帳（${LEDGER}）が空です。既存DBなら --baseline <migration名> で\n` +
          "「どこまで適用済みか」を宣言してください（その分は実行せず記録だけします）。\n" +
          "まっさらなDBなら --baseline なしで全件適用したいところですが、取り違えると\n" +
          "既存データを壊しうるため、意図的にここで停止します。",
      );
    }
    const known = resolveBaseline(all, baseline);
    console.log(`ベースライン適用: ${known.length}件を「実行せず記録のみ」`);
    if (dryRun) {
      known.forEach((n) => console.log(`  [記録のみ] ${n}`));
    } else {
      await execute(
        known.map(
          (n) =>
            `INSERT OR IGNORE INTO ${LEDGER} (name, appliedAt) VALUES ('${n}', datetime('now'))`,
        ),
      );
      applied.push(...known);
    }
  }

  const pending = selectPending(all, applied);
  if (pending.length === 0) {
    console.log("未適用のマイグレーションはありません。");
    return;
  }
  console.log(`未適用: ${pending.length}件`);
  pending.forEach((n) => console.log(`  - ${n}`));

  if (dryRun) {
    console.log("--dry-run のため適用しません。");
    return;
  }

  for (const name of pending) {
    const sql = await readFile(join(MIGRATIONS_DIR, name, "migration.sql"), "utf8");
    const statements = splitSqlStatements(sql);
    console.log(`適用中: ${name}（${statements.length}文）`);
    await execute([
      ...statements,
      `INSERT INTO ${LEDGER} (name, appliedAt) VALUES ('${name}', datetime('now'))`,
    ]);
    console.log(`  → 完了`);
  }
  console.log(`${pending.length}件を適用しました。`);
}

main().catch((e) => {
  console.error("\nマイグレーションに失敗しました。デプロイを中止します。");
  console.error(e.message ?? e);
  process.exit(1);
});
