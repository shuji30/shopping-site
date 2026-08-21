// 本番（Turso）へマイグレーションを適用するための純粋ロジック（loop 74）。
//
// 実行そのものは scripts/migrate-turso.mjs が行う。ここには DOM にも fetch にも
// 依存しない判定・変換だけを置き、単体テストで固める。
// CD（deploy.yml）から呼ばれ、**失敗したらデプロイを中止する**のが前提。

/**
 * libSQL の接続URLを HTTP API のベースURLに変換する。
 * Turso の URL は `libsql://<db>-<org>.turso.io` の形で、HTTP でも同じホストを使う。
 * 既に https:// なら（ローカルの sqld など）そのまま返す。
 */
export function toHttpUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (trimmed.startsWith("libsql://")) {
    return "https://" + trimmed.slice("libsql://".length);
  }
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return trimmed;
  }
  throw new Error(`対応していない DATABASE_URL です: ${url}`);
}

/**
 * migration.sql を1文ずつに分割する。
 *
 * libSQL の execute は1リクエストにつき1文しか受け付けないため、`;` で区切る。
 * Prisma が生成する SQL は行コメント（`-- ...`）と単純な DDL だけなので、
 * 行コメントを落としてから分割すれば足りる。**文字列リテラル内の `;` は
 * 考慮していない**ので、そういう SQL を書くときは手動適用すること。
 */
export function splitSqlStatements(sql: string): string[] {
  return sql
    .split("\n")
    .map((line) => (line.trimStart().startsWith("--") ? "" : line))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** マイグレーション名は時刻プレフィックスで辞書順＝適用順になる */
export function sortMigrationNames(names: string[]): string[] {
    return [...names].sort();
}

/**
 * 未適用のマイグレーション名を適用順に返す。
 * 台帳（applied）に無いものがすべて対象。名前の昇順で適用する。
 */
export function selectPending(all: string[], applied: string[]): string[] {
  const done = new Set(applied);
  return sortMigrationNames(all).filter((name) => !done.has(name));
}

/**
 * ベースライン指定を解決する。
 *
 * すでに手作業で適用済みのDBに対して初回だけ使う。指定した名前まで（それを含む）を
 * 「実行せずに適用済みとして記録する」対象として返す。
 * 名前が存在しなければ例外（打ち間違いで全件スキップされるのを防ぐ）。
 */
export function resolveBaseline(all: string[], baseline: string): string[] {
  const sorted = sortMigrationNames(all);
  const index = sorted.indexOf(baseline);
  if (index === -1) {
    throw new Error(
      `ベースライン "${baseline}" が prisma/migrations に見つかりません。` +
        `指定できるのは: ${sorted.join(", ")}`,
    );
  }
  return sorted.slice(0, index + 1);
}
