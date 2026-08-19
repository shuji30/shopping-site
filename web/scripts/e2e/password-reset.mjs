// Playwright での動作確認スクリプト: パスワードリマインダー（再設定）機能（loop 61）
//
// 実行方法（開発サーバーを先に起動しておくこと）:
//   npm run dev -- -p 3000   （別ターミナル）
//   npx tsx scripts/e2e/password-reset.mjs
//
// 確認する内容:
//   1) 未登録メールアドレスでも「送信しました」の汎用メッセージが出る（存在有無を推測されない）
//   2) 登録済みメールアドレスで再設定を申請 → EmailLogにトークン付きリンクが記録される
//   3) リンクから新しいパスワードを設定 → マイページへ自動ログイン
//   4) 新しいパスワードでログインできる（旧パスワードでは失敗する）
//   5) 使用済みトークンは再利用できない
//
// このスクリプトが作成したテストユーザーは、成功/失敗を問わず最後に自己削除する。
//
// 参照: .claude/skills/loop-instruction/SKILL.md の「Playwrightでの動作確認」節。
import { chromium } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/db.ts";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const email = `pw-verify-${randomUUID().slice(0, 8)}@example.jp`;
const oldPassword = "old-password-1234";
const newPassword = "new-password-5678";

function log(label) {
  console.log(`\n=== ${label} ===`);
}

async function cleanup() {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
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
  await page.fill("#name", "パスワードリマインダー検証");
  await page.fill("#email", email);
  await page.fill("#password", oldPassword);
  await page.fill("#password-confirm", oldPassword);
  await page.click("button:has-text('登録する')");
  await page.waitForURL(`${BASE}/mypage`);
  console.log("signed up as", email);

  // 以降、ログイン中はヘッダーにも <button type=submit>ログアウト</button> が
  // 存在するため、`button[type=submit]` のような曖昧なセレクタで誤ってそちらを
  // クリックしてしまう（実際にこれで一度ハマった）。必ずボタンのテキストで
  // 対象フォームを特定すること。

  log("request reset for unregistered email (should still say sent)");
  await page.goto(`${BASE}/forgot-password`);
  await page.fill("#email", `not-registered-${randomUUID().slice(0, 6)}@example.jp`);
  await page.click("button:has-text('再設定メールを送信')");
  await page.waitForSelector("text=登録されている場合");
  const genericMessageForUnknown = await page
    .locator("text=登録されている場合")
    .count();
  console.log("generic message shown for unknown email:", genericMessageForUnknown === 1);

  log("request reset for the real email");
  await page.goto(`${BASE}/forgot-password`);
  await page.fill("#email", email);
  await page.click("button:has-text('再設定メールを送信')");
  await page.waitForSelector("text=登録されている場合");

  const emailLog = await prisma.emailLog.findFirst({
    where: { to: email, kind: "password_reset" },
    orderBy: { createdAt: "desc" },
  });
  const token = emailLog?.body.match(/token=([a-f0-9]+)/)?.[1];
  console.log("reset token captured from EmailLog:", !!token);

  log("reset password via the link");
  await page.goto(`${BASE}/reset-password?token=${token}`);
  await page.fill("#password", newPassword);
  await page.fill("#password-confirm", newPassword);
  await page.click("button:has-text('パスワードを再設定する')");
  await page.waitForURL(`${BASE}/mypage`);
  console.log("auto-logged in to mypage after reset");

  log("verify old password fails and new password works");
  // 現在ログイン中なので、先にログアウトしてから /login のフォームを操作する。
  await page.click("form button:has-text('ログアウト')");
  await page.goto(`${BASE}/login`);
  await page.fill("#email", email);
  await page.fill("#password", oldPassword);
  await page.click("button:has-text('ログイン')");
  await page.waitForSelector("text=メールアドレスまたはパスワードが正しくありません");
  const oldPasswordRejected = await page
    .locator("text=メールアドレスまたはパスワードが正しくありません")
    .count();
  console.log("old password rejected:", oldPasswordRejected === 1);

  await page.fill("#password", newPassword);
  await page.click("button:has-text('ログイン')");
  await page.waitForURL(`${BASE}/mypage`);
  const loggedInWithNewPassword = page.url() === `${BASE}/mypage`;
  console.log("logged in with new password:", loggedInWithNewPassword);

  log("reused token should now fail");
  await page.goto(`${BASE}/reset-password?token=${token}`);
  await page.fill("#password", "another-password-0000");
  await page.fill("#password-confirm", "another-password-0000");
  await page.click("button:has-text('パスワードを再設定する')");
  await page.waitForSelector("text=有効期限が切れているか");
  const reuseRejected = await page
    .locator("text=有効期限が切れているか")
    .count();
  console.log("reused token rejected:", reuseRejected === 1);

  console.log("\n=== RESULT ===");
  const ok =
    genericMessageForUnknown === 1 &&
    !!token &&
    oldPasswordRejected === 1 &&
    loggedInWithNewPassword &&
    reuseRejected === 1;
  console.log(ok ? "PASS" : "FAIL");
  if (!ok) process.exitCode = 1;
} finally {
  await browser.close();
  await cleanup();
}
