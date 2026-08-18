// Playwright での動作確認スクリプト（例）: ログイン中の予約申込フォーム自動入力（loop 48）
//
// 実行方法（開発サーバーを先に起動しておくこと）:
//   npm run dev -- -p 3000   （別ターミナル）
//   npx tsx scripts/e2e/checkout-autofill.mjs
//
// 確認する内容:
//   1) 会員登録直後（予約履歴なし）→ 会員情報（名前・メール）のみ自動入力される
//   2) 1件予約した後の2回目のチェックアウト → 電話番号・住所も自動入力され、案内文が出る
//
// このスクリプトが作成したテストユーザー・予約は、成功/失敗を問わず最後に自己削除する。
//
// 参照: .claude/skills/loop-instruction/SKILL.md の「Playwrightでの動作確認」節。
import { chromium } from "@playwright/test";
import { randomUUID, randomInt } from "node:crypto";
import { PrismaClient } from "../../lib/generated/prisma/client.ts";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const email = `pw-verify-${randomUUID().slice(0, 8)}@example.jp`;
const password = "playwright-test-1234";
// 既存の予約（貸出中期間）と衝突しないよう、実行のたびに広い範囲でランダムな未来日を選ぶ。
// 直近の日付は既存データの予約と重なりやすく「カートに追加」ボタンが disabled のまま
// タイムアウトする → まずこの衝突を疑うこと。
const startDate = new Date(Date.now() + randomInt(30, 300) * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);
const startDate2 = new Date(Date.now() + randomInt(300, 600) * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

function log(label) {
  console.log(`\n=== ${label} ===`);
}

// lib/*.ts は "server-only" を import しているため、Next.js のバンドラを経由しない
// 素の Node/tsx 実行からはそれらのモジュールを import できない。
// DB を直接触りたい場合は、このように Prisma クライアントを自前で組み立てる。
async function cleanup() {
  const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url: "file:./dev.db" }) });
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.reservation.deleteMany({ where: { userId: user.id } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log("cleaned up test user:", email);
  }
  await prisma.$disconnect();
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage();

  log("signup");
  await page.goto(`${BASE}/signup`);
  await page.fill("#name", "Playwright検証太郎");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
  await page.waitForURL(`${BASE}/mypage`);
  console.log("signed up as", email);

  log("add to cart #1");
  await page.goto(`${BASE}/kimonos`);
  await page.locator("a[href^='/kimono/']").first().click();
  await page.waitForSelector("#start-date");
  await page.fill("#start-date", startDate);
  await page.locator("button:has-text('カートに追加')").click();

  log("checkout #1 (before any reservation)");
  await page.goto(`${BASE}/checkout`);
  await page.waitForSelector("#name");
  const before = {
    name: await page.inputValue("#name"),
    email: await page.inputValue("#email"),
    tel: await page.inputValue("#tel"),
    address: await page.inputValue("#address"),
    banner: await page.locator("text=前回のご注文内容").count(),
  };
  console.log("prefilled (1st visit):", before);

  // 予約を1件確定させ、次のチェックアウトで参照される「直近の予約」を作る
  await page.fill("#tel", "090-0000-1111");
  await page.fill("#address", "東京都テスト区1-2-3");
  await page.click("button:has-text('この内容で申し込む')");
  await page.waitForSelector("text=お申込ありがとうございます");
  console.log("1st reservation submitted");

  log("add to cart #2");
  await page.goto(`${BASE}/kimonos`);
  await page.locator("a[href^='/kimono/']").nth(1).click();
  await page.waitForSelector("#start-date");
  await page.fill("#start-date", startDate2);
  await page.locator("button:has-text('カートに追加')").click();

  log("checkout #2 (after one reservation)");
  await page.goto(`${BASE}/checkout`);
  await page.waitForSelector("#name");
  const after = {
    name: await page.inputValue("#name"),
    email: await page.inputValue("#email"),
    tel: await page.inputValue("#tel"),
    address: await page.inputValue("#address"),
    banner: await page.locator("text=前回のご注文内容").count(),
  };
  console.log("prefilled (2nd visit):", after);

  console.log("\n=== RESULT ===");
  console.log("before:", before);
  console.log("after:", after);

  const ok =
    before.tel === "" &&
    before.address === "" &&
    before.banner === 0 &&
    after.tel === "090-0000-1111" &&
    after.address === "東京都テスト区1-2-3" &&
    after.banner === 1;
  console.log(ok ? "\nPASS" : "\nFAIL");
  if (!ok) process.exitCode = 1;
} finally {
  await browser.close();
  await cleanup();
}
