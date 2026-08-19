// Playwright での動作確認スクリプト: 商品一覧のページネーション（loop 66）
//
// 実行方法（開発サーバーを先に起動しておくこと）:
//   npm run dev -- -p 3000   （別ターミナル）
//   npx tsx scripts/e2e/kimonos-pagination.mjs
//
// 確認する内容:
//   1) 1ページ目は PAGE_SIZE 件までしか並ばず、「次へ」で2ページ目に進める
//   2) 2ページ目の商品は1ページ目と重複しない（＝実際に切り出されている）
//   3) 「前へ」で戻れる。1ページ目では「前へ」がリンクではない
//   4) 検索・並び替えの条件がページ移動後も維持される
//   5) 絞り込みで1ページに収まるときはページ送りが出ない
//
// DBは読むだけで、データの作成・削除は行わない。
//
// 参照: .claude/skills/loop-instruction/SKILL.md の「Playwrightでの動作確認」節。
import { launchChromium } from "./browser.mjs";
import { prisma } from "../../lib/db.ts";
import { PAGE_SIZE } from "../../lib/kimono-filter.ts";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

function log(label) {
  console.log(`\n=== ${label} ===`);
}

async function cardIds(page) {
  return page.locator("a[href^='/kimono/']").evaluateAll((nodes) =>
    nodes.map((n) => n.getAttribute("href")),
  );
}

const browser = await launchChromium();
try {
  const total = await prisma.kimono.count();
  console.log("kimonos in DB:", total, "/ PAGE_SIZE:", PAGE_SIZE);
  if (total <= PAGE_SIZE) {
    throw new Error(
      `商品が${PAGE_SIZE}件以下ではページ送りを検証できません（npm run db:seed を実行してください）`,
    );
  }

  const page = await browser.newPage();

  log("page 1: PAGE_SIZE 件までしか並ばない");
  await page.goto(`${BASE}/kimonos`);
  await page.waitForSelector("a[href^='/kimono/']");
  const firstIds = await cardIds(page);
  const prevDisabled =
    (await page.locator("nav[aria-label='ページ送り'] span:has-text('前へ')").count()) === 1;
  console.log("cards on page 1:", firstIds.length, "prev is not a link:", prevDisabled);

  log("「次へ」で2ページ目へ");
  await page.click("nav[aria-label='ページ送り'] a:has-text('次へ')");
  await page.waitForURL(/[?&]page=2/);
  const secondIds = await cardIds(page);
  const overlap = secondIds.filter((id) => firstIds.includes(id));
  console.log("cards on page 2:", secondIds.length, "overlap with page 1:", overlap.length);

  log("「前へ」で1ページ目に戻る");
  await page.click("nav[aria-label='ページ送り'] a:has-text('前へ')");
  await page.waitForURL((u) => !u.searchParams.get("page"));
  const backIds = await cardIds(page);
  const backOk = JSON.stringify(backIds) === JSON.stringify(firstIds);
  console.log("back on page 1 with same cards:", backOk);

  log("並び替え条件がページ移動後も維持される");
  await page.goto(`${BASE}/kimonos?sort=price-asc`);
  await page.click("nav[aria-label='ページ送り'] a:has-text('次へ')");
  await page.waitForURL(/[?&]page=2/);
  const url = new URL(page.url());
  const keepsSort = url.searchParams.get("sort") === "price-asc";
  // 料金昇順なので、2ページ目の最小価格は1ページ目の最大価格以上になるはず
  const prices = await page
    .locator("a[href^='/kimono/']")
    .evaluateAll((nodes) =>
      nodes
        .map((n) => n.textContent?.match(/¥([\d,]+)/)?.[1])
        .filter(Boolean)
        .map((v) => Number(v.replaceAll(",", ""))),
    );
  const ascending = prices.every((v, i, a) => i === 0 || a[i - 1] <= v);
  console.log("sort kept in URL:", keepsSort, "page2 prices ascending:", ascending);

  log("1ページに収まる絞り込みではページ送りを出さない");
  await page.goto(`${BASE}/kimonos?q=浴衣`);
  await page.waitForSelector("text=件");
  const navCount = await page.locator("nav[aria-label='ページ送り']").count();
  console.log("pagination nav on narrowed result:", navCount);

  console.log("\n=== RESULT ===");
  const ok =
    firstIds.length === PAGE_SIZE &&
    prevDisabled &&
    secondIds.length === total - PAGE_SIZE &&
    overlap.length === 0 &&
    backOk &&
    keepsSort &&
    ascending &&
    navCount === 0;
  console.log(ok ? "PASS" : "FAIL");
  if (!ok) process.exitCode = 1;
} finally {
  await browser.close();
  await prisma.$disconnect();
}
