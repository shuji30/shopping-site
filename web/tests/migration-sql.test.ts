import { describe, it, expect } from "vitest";
import {
  resolveBaseline,
  selectPending,
  sortMigrationNames,
  splitSqlStatements,
  toHttpUrl,
} from "@/lib/migration-sql";

describe("toHttpUrl", () => {
  it("libsql:// を https:// に変換する", () => {
    expect(toHttpUrl("libsql://miyabi-shuji30.turso.io")).toBe(
      "https://miyabi-shuji30.turso.io",
    );
  });
  it("末尾のスラッシュと空白を落とす", () => {
    expect(toHttpUrl("  libsql://x.turso.io/  ")).toBe("https://x.turso.io");
  });
  it("https/http はそのまま通す（ローカルの sqld 等）", () => {
    expect(toHttpUrl("http://127.0.0.1:8080")).toBe("http://127.0.0.1:8080");
    expect(toHttpUrl("https://x.turso.io")).toBe("https://x.turso.io");
  });
  it("file: など非対応のURLは例外", () => {
    expect(() => toHttpUrl("file:./dev.db")).toThrow();
  });
});

describe("splitSqlStatements", () => {
  it("行コメントを落として ; で分割する", () => {
    const sql = `-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY
);

-- CreateIndex
CREATE INDEX "idx" ON "Category"("id");
`;
    expect(splitSqlStatements(sql)).toEqual([
      'CREATE TABLE "Category" (\n    "id" TEXT NOT NULL PRIMARY KEY\n)',
      'CREATE INDEX "idx" ON "Category"("id")',
    ]);
  });

  it("空文と空白だけの断片は捨てる", () => {
    expect(splitSqlStatements(";;\n  \n;")).toEqual([]);
  });

  it("コメントだけのファイルは空配列", () => {
    expect(splitSqlStatements("-- 何もしない\n-- ここもコメント\n")).toEqual([]);
  });

  it("末尾にセミコロンが無くても1文として拾う", () => {
    expect(splitSqlStatements("SELECT 1")).toEqual(["SELECT 1"]);
  });
});

describe("sortMigrationNames", () => {
  it("時刻プレフィックスの辞書順に並べ、元配列は変更しない", () => {
    const src = ["20260819045007_b", "20260808083317_a", "20260820164502_c"];
    const copy = [...src];
    expect(sortMigrationNames(src)).toEqual([
      "20260808083317_a",
      "20260819045007_b",
      "20260820164502_c",
    ]);
    expect(src).toEqual(copy);
  });
});

describe("selectPending", () => {
  const all = ["20260808083317_a", "20260819045007_b", "20260820164502_c"];

  it("台帳に無いものだけを適用順で返す", () => {
    expect(selectPending(all, ["20260808083317_a"])).toEqual([
      "20260819045007_b",
      "20260820164502_c",
    ]);
  });

  it("全部適用済みなら空", () => {
    expect(selectPending(all, all)).toEqual([]);
  });

  it("台帳が空なら全件", () => {
    expect(selectPending(all, [])).toEqual(all);
  });

  it("台帳に未知の名前があっても無視する（手で消したケース等）", () => {
    expect(selectPending(all, ["削除済みの何か"])).toEqual(all);
  });
});

describe("resolveBaseline", () => {
  const all = ["20260808083317_a", "20260819045007_b", "20260820164502_c"];

  it("指定した名前まで（含む）を返す", () => {
    expect(resolveBaseline(all, "20260819045007_b")).toEqual([
      "20260808083317_a",
      "20260819045007_b",
    ]);
  });

  it("最後の名前を指定すれば全件", () => {
    expect(resolveBaseline(all, "20260820164502_c")).toEqual(all);
  });

  it("存在しない名前は例外（打ち間違いで全件スキップされるのを防ぐ）", () => {
    expect(() => resolveBaseline(all, "typo")).toThrow(/見つかりません/);
  });
});
