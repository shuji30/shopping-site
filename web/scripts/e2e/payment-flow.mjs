// Playwright での動作確認スクリプト: マイページからのオンライン決済（テストモード）
//
// 実行方法（開発サーバーを先に起動しておくこと）:
//   npm run dev -- -p 3000   （別ターミナル）
//   npx tsx scripts/e2e/payment-flow.mjs
//
// 確認する内容:
//   1) 予約直後は「未払い」バッジ＋「オンライン決済」ボタンが表示される
//   2) ボタンを押すと「支払い済み」バッジに変わり、決済ボタンが消える
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
// 既存の予約データと貸出期間が重ならないよう、十分先のランダムな未来日を選ぶ
const startDate = new Date(Date.now() + randomInt(30, 700) * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

function log(label) {
  console.log(`\n=== ${label} ===`);
}

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
  await page.fill("#name", "Playwright決済検証");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
  await page.waitForURL(`${BASE}/mypage`);
  console.log("signed up as", email);

  log("add to cart & checkout");
  await page.goto(`${BASE}/kimonos`);
  await page.locator("a[href^='/kimono/']").first().click();
  await page.waitForSelector("#start-date");
  await page.fill("#start-date", startDate);
  await page.locator("button:has-text('カートに追加')").click();

  await page.goto(`${BASE}/checkout`);
  await page.waitForSelector("#tel");
  await page.fill("#tel", "090-1234-5678");
  await page.fill("#address", "東京都テスト区9-9-9");
  await page.click("button:has-text('この内容で申し込む')");
  await page.waitForSelector("text=お申込ありがとうございます");
  console.log("reservation submitted");

  log("mypage before payment");
  await page.goto(`${BASE}/mypage`);
  const before = {
    unpaidBadge: await page.locator("text=未払い").count(),
    paidBadge: await page.locator("text=支払い済み").count(),
    payButton: await page.locator("button:has-text('オンライン決済')").count(),
  };
  console.log("before payment:", before);

  log("pay now");
  await page.locator("button:has-text('オンライン決済')").click();
  await page.waitForSelector("text=支払い済み");

  const after = {
    unpaidBadge: await page.locator("text=未払い").count(),
    paidBadge: await page.locator("text=支払い済み").count(),
    payButton: await page.locator("button:has-text('オンライン決済')").count(),
  };
  console.log("after payment:", after);

  console.log("\n=== RESULT ===");
  console.log("before:", before);
  console.log("after:", after);

  const ok =
    before.unpaidBadge === 1 &&
    before.paidBadge === 0 &&
    before.payButton === 1 &&
    after.unpaidBadge === 0 &&
    after.paidBadge === 1 &&
    after.payButton === 0;
  console.log(ok ? "\nPASS" : "\nFAIL");
  if (!ok) process.exitCode = 1;
} finally {
  await browser.close();
  await cleanup();
}
