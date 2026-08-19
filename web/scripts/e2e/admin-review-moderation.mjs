// Playwright での動作確認スクリプト: 管理画面からのレビュー削除（モデレーション、loop 47）
//
// 実行方法（開発サーバーを先に起動しておくこと）:
//   npm run dev -- -p 3000   （別ターミナル）
//   npx tsx scripts/e2e/admin-review-moderation.mjs
//
// 確認する内容:
//   1) 商品詳細ページでレビューを投稿すると、一覧・管理画面の両方に現れる
//   2) 管理画面（Basic認証）で削除すると、両方から消える
//
// このスクリプトが投稿したレビューは、成功/失敗を問わず最後に自己削除する
// （削除確認自体が目的だが、削除操作に失敗した場合に備えて finally でも保証する）。
//
// 参照: .claude/skills/loop-instruction/SKILL.md の「Playwrightでの動作確認」節。
import { launchChromium } from "./browser.mjs";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/db.ts";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const ADMIN_USER = process.env.ADMIN_USER ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "change-me";
const reviewerName = `Playwright検証-${randomUUID().slice(0, 8)}`;
const comment = `モデレーション確認用の一時レビューです（${randomUUID()}）`;

function log(label) {
  console.log(`\n=== ${label} ===`);
}

async function cleanup() {
  const r = await prisma.review.deleteMany({ where: { name: reviewerName } });
  if (r.count > 0) console.log("cleaned up", r.count, "leftover review(s)");
  await prisma.$disconnect();
}

const browser = await launchChromium();
try {
  const page = await browser.newPage();

  log("post a review on a product detail page");
  await page.goto(`${BASE}/kimonos`);
  await page.locator("a[href^='/kimono/']").first().click();
  const kimonoUrl = page.url();
  await page.fill("#review-name", reviewerName);
  await page.fill("#review-comment", comment);
  await page.click("button:has-text('投稿する')");
  await page.waitForSelector("text=レビューを投稿しました");

  await page.reload();
  const onDetail = await page.locator(`text=${comment}`).count();
  console.log("review visible on detail page:", onDetail === 1);

  log("admin: review appears in moderation list");
  // Playwright の browser.newContext({ httpCredentials }) は、本番のHTTPS環境
  // （Cloud Run等）に対しては応答が返らずタイムアウトすることがあった
  // （ローカルのHTTPでは問題ない）。Authorizationヘッダーを直接付与する方式なら
  // どちらでも確実に動く。
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const basicAuth = Buffer.from(`${ADMIN_USER}:${ADMIN_PASSWORD}`).toString("base64");
  await adminPage.setExtraHTTPHeaders({ Authorization: `Basic ${basicAuth}` });
  await adminPage.goto(`${BASE}/admin/reviews`);
  const onAdminBefore = await adminPage.locator(`text=${comment}`).count();
  console.log("review visible in admin list:", onAdminBefore === 1);

  log("admin: delete the review");
  adminPage.once("dialog", (d) => d.accept()); // window.confirm
  const row = adminPage.locator("li", { hasText: comment });
  await row.locator("button:has-text('削除')").click();
  await adminPage.waitForSelector(`text=${comment}`, { state: "detached" });
  const onAdminAfter = await adminPage.locator(`text=${comment}`).count();
  console.log("review still in admin list after delete:", onAdminAfter);

  log("detail page reflects the deletion too");
  await page.goto(kimonoUrl);
  const onDetailAfter = await page.locator(`text=${comment}`).count();
  console.log("review still on detail page after delete:", onDetailAfter);

  console.log("\n=== RESULT ===");
  const ok =
    onDetail === 1 && onAdminBefore === 1 && onAdminAfter === 0 && onDetailAfter === 0;
  console.log(ok ? "PASS" : "FAIL");
  if (!ok) process.exitCode = 1;
} finally {
  await browser.close();
  await cleanup();
}
