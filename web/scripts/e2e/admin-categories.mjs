// Playwright での動作確認スクリプト: 管理画面のカテゴリマスタCRUD（loop 72）
//
// 実行方法（開発サーバーを先に起動しておくこと）:
//   npm run dev -- -p 3000   （別ターミナル）
//   npx tsx scripts/e2e/admin-categories.mjs
//
// 確認する内容:
//   1) 登録: 新しいカテゴリを追加すると一覧とDBに現れ、店舗側の絞り込みにも出る
//   2) 変更: 表示名・説明・表示順を変更するとDBと店舗側の表示に反映される
//   3) 削除できない: 商品が紐づくカテゴリ（振袖など）は削除ボタンが disabled
//   4) 削除: 商品が0件のカテゴリは削除でき、一覧・DB・店舗側から消える
//   5) 重複: 既存の識別子で登録するとエラーになる
//
// 作成したカテゴリは、成功/失敗を問わず finally で自己削除する。
//
// 参照: .claude/skills/loop-instruction/SKILL.md の「Playwrightでの動作確認」節。
import { launchChromium } from "./browser.mjs";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/db.ts";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const ADMIN_USER = process.env.ADMIN_USER ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "change-me";

// 既存マスタと衝突しない識別子（半角小文字・数字・ハイフンのみ）
const testId = `pw-verify-${randomUUID().slice(0, 8)}`;
const label = "検証用カテゴリ";
const renamedLabel = "検証用カテゴリ（改）";

function log(l) {
  console.log(`\n=== ${l} ===`);
}

async function cleanup() {
  const r = await prisma.category.deleteMany({ where: { id: testId } });
  if (r.count > 0) console.log("cleaned up category:", testId);
  await prisma.$disconnect();
}

const browser = await launchChromium();
try {
  const page = await browser.newPage();
  const basicAuth = Buffer.from(`${ADMIN_USER}:${ADMIN_PASSWORD}`).toString("base64");
  await page.setExtraHTTPHeaders({ Authorization: `Basic ${basicAuth}` });

  log("登録");
  await page.goto(`${BASE}/admin/categories`);
  await page.waitForSelector("#new-id");
  await page.fill("#new-id", testId);
  await page.fill("#new-label", label);
  await page.fill("#new-description", "Playwright検証のための一時カテゴリです。");
  await page.fill("#new-sort-order", "999");
  await page.click("button:has-text('追加する')");
  await page.waitForSelector(`text=「${label}」を追加しました。`);
  const created = await prisma.category.findUnique({ where: { id: testId } });
  console.log("created in DB:", created?.label, "/ sortOrder:", created?.sortOrder);

  log("店舗側の絞り込みに現れる");
  const shop = await browser.newPage();
  await shop.goto(`${BASE}/kimonos`);
  const chipAfterCreate = await shop
    .locator(`button:has-text('${label}')`)
    .count();
  console.log("filter chip present:", chipAfterCreate === 1);

  log("重複した識別子は拒否される");
  await page.fill("#new-id", testId);
  await page.fill("#new-label", "重複テスト");
  await page.fill("#new-description", "重複した識別子で登録できないことの確認。");
  await page.click("button:has-text('追加する')");
  await page.waitForSelector(`text=識別子「${testId}」はすでに使われています。`);
  const dupCount = await prisma.category.count({ where: { id: testId } });
  console.log("still one row:", dupCount === 1);

  log("変更");
  const row = page.locator("tr", { hasText: testId });
  await row.locator("button:has-text('編集する')").click();
  const editing = page.locator("tr", { hasText: testId });
  await editing.locator("input[aria-label='表示名']").fill(renamedLabel);
  await editing.locator("input[aria-label='表示順']").fill("998");
  await editing.locator("button:has-text('保存する')").click();
  await page.waitForSelector(`text=「${renamedLabel}」を更新しました。`);
  const updated = await prisma.category.findUnique({ where: { id: testId } });
  console.log("updated in DB:", updated?.label, "/ sortOrder:", updated?.sortOrder);

  await shop.reload();
  const chipAfterRename =
    (await shop.locator(`button:has-text('${renamedLabel}')`).count()) === 1;
  console.log("renamed chip on shop side:", chipAfterRename);

  log("商品が紐づくカテゴリは削除できない");
  const usedId = (
    await prisma.kimono.findFirst({ select: { category: true } })
  ).category;
  const usedRow = page.locator("tr", { hasText: usedId });
  const deleteDisabled = await usedRow
    .locator("button:has-text('削除する')")
    .isDisabled();
  console.log(`"${usedId}" delete button disabled:`, deleteDisabled);

  log("商品が0件のカテゴリは削除できる");
  page.once("dialog", (d) => d.accept()); // window.confirm
  await page
    .locator("tr", { hasText: testId })
    .locator("button:has-text('削除する')")
    .click();
  await page.waitForSelector(`text=「${renamedLabel}」を削除しました。`);
  const afterDelete = await prisma.category.findUnique({ where: { id: testId } });
  console.log("deleted from DB:", afterDelete === null);

  await shop.reload();
  const chipAfterDelete = await shop
    .locator(`button:has-text('${renamedLabel}')`)
    .count();
  console.log("chip removed on shop side:", chipAfterDelete === 0);

  console.log("\n=== RESULT ===");
  const ok =
    created?.label === label &&
    created?.sortOrder === 999 &&
    chipAfterCreate === 1 &&
    dupCount === 1 &&
    updated?.label === renamedLabel &&
    updated?.sortOrder === 998 &&
    chipAfterRename &&
    deleteDisabled &&
    afterDelete === null &&
    chipAfterDelete === 0;
  console.log(ok ? "PASS" : "FAIL");
  if (!ok) process.exitCode = 1;
} finally {
  await browser.close();
  await cleanup();
}
