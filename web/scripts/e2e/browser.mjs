// Playwright の Chromium を起動する共通ヘルパー。
//
// 環境によって Chromium の置き場所が違う（`npx playwright install` で入れた
// 既定の場所／CI やリモート実行環境が用意した `PLAYWRIGHT_BROWSERS_PATH` 配下）。
// `@playwright/test` のバージョンが環境の同梱ビルドとずれていると、既定の
// `chromium.launch()` は「Executable doesn't exist at .../chromium_headless_shell-<rev>」
// で落ちる（loop 62 で実際に踏んだ）。その場合でも実体は
// `$PLAYWRIGHT_BROWSERS_PATH/chromium` にあることが多いので、存在すれば
// `executablePath` として明示的に渡す。
//
// 明示的に使うバイナリを指定したいときは E2E_CHROMIUM_PATH で上書きできる。
import { existsSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

function resolveExecutablePath() {
  const explicit = process.env.E2E_CHROMIUM_PATH;
  if (explicit) return explicit;

  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (root) {
    const candidate = join(root, "chromium");
    if (existsSync(candidate)) return candidate;
  }
  // 見つからなければ Playwright の既定解決に任せる
  return undefined;
}

export function launchChromium(options = {}) {
  const executablePath = resolveExecutablePath();
  return chromium.launch(executablePath ? { executablePath, ...options } : options);
}
