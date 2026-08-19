// Playwright での動作確認スクリプト: 会員登録のパスワード確認2回入力（loop 60）
//
// 実行方法（開発サーバーを先に起動しておくこと）:
//   npm run dev -- -p 3000   （別ターミナル）
//   npx tsx scripts/e2e/signup-password-confirm.mjs
//
// 確認する内容:
//   1) パスワードとパスワード（確認）が不一致 → エラー表示、会員登録されない
//   2) 一致させて再送信 → 登録成功しマイページへ遷移
//
// このスクリプトが作成したテストユーザーは、成功/失敗を問わず最後に自己削除する。
//
// 参照: .claude/skills/loop-instruction/SKILL.md の「Playwrightでの動作確認」節。
import { chromium } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/db.ts";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const email = `pw-verify-${randomUUID().slice(0, 8)}@example.jp`;
const password = "correct-password-1234";

function log(label) {
  console.log(`\n=== ${label} ===`);
}

async function cleanup() {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log("cleaned up test user:", email);
  }
  await prisma.$disconnect();
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage();

  log("mismatched passwords");
  await page.goto(`${BASE}/signup`);
  await page.fill("#name", "パスワード確認検証");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.fill("#password-confirm", "different-password-9999");
  await page.click("button[type=submit]");
  await page.waitForSelector("text=パスワードが一致しません");
  const stillOnSignup = page.url().includes("/signup");
  console.log("still on signup page after mismatch:", stillOnSignup);

  const createdDuringMismatch = await prisma.user.findUnique({ where: { email } });
  console.log("no user created during mismatch:", createdDuringMismatch === null);

  log("matching passwords");
  await page.fill("#password-confirm", password);
  await page.click("button[type=submit]");
  await page.waitForURL(`${BASE}/mypage`);
  console.log("navigated to mypage after matching passwords");

  const createdAfterMatch = await prisma.user.findUnique({ where: { email } });
  console.log("user created after match:", createdAfterMatch !== null);

  console.log("\n=== RESULT ===");
  const ok =
    stillOnSignup &&
    createdDuringMismatch === null &&
    page.url() === `${BASE}/mypage` &&
    createdAfterMatch !== null;
  console.log(ok ? "PASS" : "FAIL");
  if (!ok) process.exitCode = 1;
} finally {
  await browser.close();
  await cleanup();
}
