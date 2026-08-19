// Playwright での動作確認スクリプト: 管理画面からの入金ステータス手動更新（loop 62）
//
// 実行方法（開発サーバーを先に起動しておくこと。ADMIN_PASSWORDを合わせること）:
//   ADMIN_PASSWORD=e2e-test-pass npm run dev -- -p 3000   （別ターミナル）
//   ADMIN_PASSWORD=e2e-test-pass npx tsx scripts/e2e/admin-payment-status.mjs
//
// 確認する内容:
//   1) 会員登録→カート追加→予約申込→マイページで「未払い」バッジ・決済ボタンを確認
//   2) 管理画面の予約詳細で「返金済み」に手動変更 → バッジが切り替わる
//   3) マイページでは「返金済み」バッジになり、決済ボタンは表示されない
//
// このスクリプトが作成したテストユーザー・予約は、成功/失敗を問わず最後に自己削除する。
//
// 参照: .claude/skills/loop-instruction/SKILL.md の「Playwrightでの動作確認」節。
import { chromium } from "@playwright/test";
import { randomUUID, randomInt } from "node:crypto";
import { prisma } from "../../lib/db.ts";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const ADMIN_USER = process.env.ADMIN_USER ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "change-me";
const email = `pw-verify-${randomUUID().slice(0, 8)}@example.jp`;
const password = "playwright-test-1234";
const startDate = new Date(Date.now() + randomInt(30, 700) * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

function log(label) {
  console.log(`\n=== ${label} ===`);
}

async function cleanup() {
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

  log("signup, add to cart, checkout");
  await page.goto(`${BASE}/signup`);
  await page.fill("#name", "入金ステータス検証");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.fill("#password-confirm", password);
  await page.click("button:has-text('登録する')");
  await page.waitForURL(`${BASE}/mypage`);

  await page.goto(`${BASE}/kimonos`);
  await page.locator("a[href^='/kimono/']").first().click();
  await page.waitForSelector("#start-date");
  await page.fill("#start-date", startDate);
  await page.locator("button:has-text('カートに追加')").click();

  await page.goto(`${BASE}/checkout`);
  await page.waitForSelector("#tel");
  await page.fill("#tel", "090-1111-2222");
  await page.fill("#address", "東京都テスト区5-5-5");
  await page.click("button:has-text('この内容で申し込む')");
  await page.waitForSelector("text=お申込ありがとうございます");

  const reservation = await prisma.reservation.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });
  console.log("reservation created:", !!reservation, "paymentStatus:", reservation?.paymentStatus);

  log("mypage shows unpaid + pay button");
  await page.goto(`${BASE}/mypage`);
  const unpaidBefore = await page.locator("text=未払い").count();
  const payButtonBefore = await page.locator("button:has-text('オンライン決済')").count();
  console.log("unpaid badge:", unpaidBefore === 1, "pay button:", payButtonBefore === 1);

  log("admin: change payment status to refunded");
  const adminPage = await browser.newPage();
  await adminPage.setExtraHTTPHeaders({
    Authorization: "Basic " + Buffer.from(`${ADMIN_USER}:${ADMIN_PASSWORD}`).toString("base64"),
  });
  await adminPage.goto(`${BASE}/admin/reservations/${reservation.id}`);
  await adminPage.click("button:has-text('返金済み')");
  await adminPage.waitForSelector("text=返金済み");
  console.log("admin badge updated to refunded");

  const afterUpdate = await prisma.reservation.findUnique({ where: { id: reservation.id } });
  console.log("DB paymentStatus is refunded:", afterUpdate.paymentStatus === "refunded");

  log("mypage now shows refunded, no pay button");
  await page.goto(`${BASE}/mypage`);
  const refundedAfter = await page.locator("text=返金済み").count();
  const payButtonAfter = await page.locator("button:has-text('オンライン決済')").count();
  console.log("refunded badge:", refundedAfter === 1, "pay button gone:", payButtonAfter === 0);

  console.log("\n=== RESULT ===");
  const ok =
    !!reservation &&
    reservation.paymentStatus === "unpaid" &&
    unpaidBefore === 1 &&
    payButtonBefore === 1 &&
    afterUpdate.paymentStatus === "refunded" &&
    refundedAfter === 1 &&
    payButtonAfter === 0;
  console.log(ok ? "PASS" : "FAIL");
  if (!ok) process.exitCode = 1;
} finally {
  await browser.close();
  await cleanup();
}
