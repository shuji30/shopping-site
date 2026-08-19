// Playwright での動作確認スクリプト: 予約申込フォームの入力検証（loop 67）
//
// 実行方法（開発サーバーを先に起動しておくこと）:
//   npm run dev -- -p 3000   （別ターミナル）
//   npx tsx scripts/e2e/checkout-validation.mjs
//
// 確認する内容:
//   1) 未入力で送信すると、必須4項目のエラーが同時に出て送信されない
//   2) メール形式が不正なら「形式が正しくありません」に変わる
//   3) 店頭受取に切り替えると住所欄ごと消え、住所エラーも出ない
//   4) 正しく入力すれば申込が完了する
//
// 検証用に作られた予約は、成功/失敗を問わず finally で自己削除する。
//
// 参照: .claude/skills/loop-instruction/SKILL.md の「Playwrightでの動作確認」節。
import { launchChromium } from "./browser.mjs";
import { randomUUID, randomInt } from "node:crypto";
import { prisma } from "../../lib/db.ts";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const email = `pw-verify-${randomUUID().slice(0, 8)}@example.jp`;
// 既存データと貸出期間が重ならないよう、十分先のランダムな未来日を選ぶ
const startDate = new Date(Date.now() + randomInt(30, 700) * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

function log(label) {
  console.log(`\n=== ${label} ===`);
}

async function cleanup() {
  const r = await prisma.reservation.deleteMany({ where: { email } });
  if (r.count > 0) console.log("cleaned up test reservation(s):", r.count);
  await prisma.$disconnect();
}

/** 表示中のエラーメッセージ（赤字）を全部集める */
async function errorTexts(page) {
  return page.locator("form p.text-enji").allInnerTexts();
}

const browser = await launchChromium();
try {
  const page = await browser.newPage();

  log("カートに1点入れて申込画面へ");
  await page.goto(`${BASE}/kimonos`);
  await page.locator("a[href^='/kimono/']").first().click();
  await page.waitForSelector("#start-date");
  await page.fill("#start-date", startDate);
  await page.locator("button:has-text('カートに追加')").click();
  await page.goto(`${BASE}/checkout`);
  await page.waitForSelector("#tel");

  log("未入力のまま送信 → 必須4項目のエラー");
  await page.click("button:has-text('この内容で申し込む')");
  await page.waitForSelector("p.text-enji");
  const emptyErrors = await errorTexts(page);
  const stayedOnForm =
    (await page.locator("text=お申込ありがとうございます").count()) === 0;
  console.log("errors:", emptyErrors);
  console.log("not submitted:", stayedOnForm);

  log("メール形式が不正なら文言が変わる");
  await page.fill("#name", "検証 太郎");
  await page.fill("#email", "こわれたアドレス");
  await page.fill("#tel", "090-1234-5678");
  await page.fill("#address", "東京都テスト区7-7-7");
  await page.click("button:has-text('この内容で申し込む')");
  await page.waitForSelector("text=メールアドレスの形式が正しくありません。");
  const formatErrors = await errorTexts(page);
  console.log("errors:", formatErrors);

  log("店頭受取に切り替えると住所欄が消える");
  await page.click("text=店頭受取");
  const addressGone = (await page.locator("#address").count()) === 0;
  await page.fill("#email", email);
  await page.click("button:has-text('この内容で申し込む')");
  // 住所エラーが出ないまま申込が通るはず
  await page.waitForSelector("text=お申込ありがとうございます", { timeout: 20_000 });
  const orderNumber = (
    await page.locator("text=/MYB-\\d{8}-\\d{4}/").first().innerText()
  ).match(/MYB-\d{8}-\d{4}/)?.[0];
  console.log("address field removed:", addressGone, "orderNumber:", orderNumber);

  const saved = await prisma.reservation.findFirst({ where: { email } });
  console.log("saved as 店頭受取:", saved?.method === "store");

  console.log("\n=== RESULT ===");
  const ok =
    emptyErrors.length === 4 &&
    emptyErrors.includes("お名前を入力してください。") &&
    emptyErrors.includes("メールアドレスを入力してください。") &&
    emptyErrors.includes("電話番号を入力してください。") &&
    emptyErrors.includes("配送先のご住所を入力してください。") &&
    stayedOnForm &&
    formatErrors.length === 1 &&
    formatErrors[0] === "メールアドレスの形式が正しくありません。" &&
    addressGone &&
    !!orderNumber &&
    saved?.method === "store";
  console.log(ok ? "PASS" : "FAIL");
  if (!ok) process.exitCode = 1;
} finally {
  await browser.close();
  await cleanup();
}
