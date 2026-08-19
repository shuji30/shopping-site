// Playwright での動作確認スクリプト: トップページの PR（宣伝）部分（loop 69）
//
// 実行方法（開発サーバーを先に起動しておくこと）:
//   npm run dev -- -p 3000   （別ターミナル）
//   npx tsx scripts/e2e/home-pr.mjs
//
// 確認する内容:
//   1) ヒーローに料金・レンタル日数が出ており、**実データと一致**している
//   2) 主CTA「着物を探す」で一覧へ、副CTA「ご利用の流れを見る」で #flow へ移動できる
//   3) 「シーンから探す」の各カードが、対応カテゴリで絞り込んだ一覧へ遷移する
//   4) セクションの並びが 安心材料→シーン→注目→理由→流れ→お客様の声→CTA になっている
//   5) 末尾CTAの掲載点数が実データと一致している
//
// 「お客様の声」を出すために検証用レビューを1件だけ作り、finally で必ず消す。
//
// 参照: .claude/skills/loop-instruction/SKILL.md の「Playwrightでの動作確認」節。
import { launchChromium } from "./browser.mjs";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/db.ts";
import {
  formatDaysRange,
  formatPriceRange,
  summarizeCatalog,
} from "../../lib/catalog-summary.ts";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
// 「お客様の声」はレビューが1件も無いと描画されない。並び順を検査するために
// 検証用のレビューを1件だけ作り、finally で必ず消す。
const reviewerName = `Playwright検証-${randomUUID().slice(0, 8)}`;

function log(label) {
  console.log(`\n=== ${label} ===`);
}

async function cleanup() {
  const r = await prisma.review.deleteMany({ where: { name: reviewerName } });
  if (r.count > 0) console.log("cleaned up review(s):", r.count);
  await prisma.$disconnect();
}

const browser = await launchChromium();
try {
  const all = await prisma.kimono.findMany({
    select: { price: true, rentalDays: true },
  });
  const summary = summarizeCatalog(all);
  if (!summary) throw new Error("商品が0件です（npm run db:seed を実行してください）");
  const priceText = formatPriceRange(summary.minPrice, summary.maxPrice);
  const daysText = formatDaysRange(summary.minDays, summary.maxDays);
  console.log("expected from DB:", summary.count, "点 /", priceText, "/", daysText);

  const kimono = await prisma.kimono.findFirst({ select: { id: true } });
  await prisma.review.create({
    data: {
      kimonoId: kimono.id,
      name: reviewerName,
      rating: 5,
      comment: "トップページの並び順検証のための一時レビューです。",
    },
  });

  const page = await browser.newPage();
  await page.goto(BASE);
  await page.waitForSelector("h1");

  log("ヒーローの料金・日数が実データと一致する");
  const heroText = await page.locator("section").first().innerText();
  const showsPrice = heroText.includes(priceText);
  const showsDays = heroText.includes(daysText);
  console.log("hero shows price:", showsPrice, "/ days:", showsDays);

  log("セクションの並び");
  const headings = await page.locator("h2").allInnerTexts();
  console.log(headings);
  const order = headings.map((h) => h.trim());
  const expectedOrder = [
    "シーンから探す",
    "注目の着物",
    "雅が選ばれる理由",
    "ご利用の流れ",
    "お客様の声",
  ];
  const present = expectedOrder.filter((h) => order.includes(h));
  const orderOk =
    JSON.stringify(order.filter((h) => present.includes(h))) ===
    JSON.stringify(present);
  console.log("order preserved:", orderOk, "/ sections found:", present.length);

  log("副CTA「ご利用の流れを見る」で #flow へ");
  await page.click("a:has-text('ご利用の流れを見る')");
  await page.waitForURL(/#flow$/);
  const flowVisible = await page.locator("#flow").isVisible();
  console.log("moved to #flow:", page.url().endsWith("#flow"), "visible:", flowVisible);

  log("「シーンから探す」のカードがカテゴリ絞り込み一覧へ遷移する");
  await page.goto(BASE);
  const sceneLinks = await page
    .locator("a[href^='/kimonos?category=']")
    .evaluateAll((els) => els.map((e) => e.getAttribute("href")));
  await page.locator("a[href^='/kimonos?category=']").first().click();
  await page.waitForURL(/\/kimonos\?category=/);
  const listingHasCards =
    (await page.locator("a[href^='/kimono/']").count()) > 0;
  console.log("scene links:", sceneLinks.length, "/ listing has cards:", listingHasCards);

  log("主CTAで一覧へ");
  await page.goto(BASE);
  await page.locator("a:has-text('着物を探す')").first().click();
  await page.waitForURL(/\/kimonos$/);
  console.log("primary CTA →", page.url());

  log("末尾CTAの掲載点数が実データと一致する");
  await page.goto(BASE);
  const lastSection = await page.locator("section").last().innerText();
  const countOk = lastSection.includes(`現在 ${summary.count} 点`);
  console.log("closing note:", lastSection.split("\n").filter(Boolean).slice(0, 3));

  console.log("\n=== RESULT ===");
  const ok =
    showsPrice &&
    showsDays &&
    orderOk &&
    present.length === expectedOrder.length &&
    flowVisible &&
    sceneLinks.length === 6 &&
    listingHasCards &&
    countOk;
  console.log(ok ? "PASS" : "FAIL");
  if (!ok) process.exitCode = 1;
} finally {
  await browser.close();
  await cleanup();
}
