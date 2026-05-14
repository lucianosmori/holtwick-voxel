// scripts/validate-visual.mjs
//
// Headless-browser validation gate for the 07 ralph loop.
//
// What it does:
//   1. Boots `vite preview` on port 4173 against the freshly built `dist/`.
//   2. Loads the page with Playwright/Chromium, waits for canvas#game.
//   3. Captures any console.error / pageerror events while the RAF loop runs.
//   4. Saves a full-page screenshot to artifacts/screenshots/iter-${ITER}.png.
//   5. Exits non-zero on any runtime error, missing canvas, or load timeout.
//
// Run via `npm run validate:visual` (set ITER env to label the screenshot).
// Requires a prior `npm run build` so dist/ is populated.

import { chromium } from "playwright";
import { preview } from "vite";
import { mkdirSync } from "node:fs";
import { setTimeout as wait } from "node:timers/promises";

const ITER = process.env.ITER ?? "manual";
const PORT = Number(process.env.PORT ?? 4173);
// `?test=1` toggles `preserveDrawingBuffer` in src/render/scene.ts so headless
// screenshots actually capture rendered frames instead of a cleared canvas.
const URL = `http://localhost:${PORT}/?test=1`;

mkdirSync("artifacts/screenshots", { recursive: true });

console.log(`[validate:visual] booting vite preview on :${PORT}`);
const server = await preview({
  preview: { port: PORT, strictPort: true, host: "127.0.0.1" },
});

let failed = false;
let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
  });

  console.log(`[validate:visual] loading ${URL}`);
  await page.goto(URL, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForSelector("canvas#game", { timeout: 5000 });
  // Let the RAF loop run several frames so the scene draws into the buffer.
  await wait(750);

  const canvasInfo = await page.evaluate(() => {
    const c = document.querySelector("canvas#game");
    return c
      ? { width: c.width, height: c.height, clientW: c.clientWidth, clientH: c.clientHeight }
      : null;
  });
  console.log(`[validate:visual] canvas: ${JSON.stringify(canvasInfo)}`);

  const shotPath = `artifacts/screenshots/iter-${ITER}.png`;
  await page.screenshot({ path: shotPath, fullPage: true });
  console.log(`[validate:visual] screenshot -> ${shotPath}`);

  if (errors.length) {
    console.error("[validate:visual] runtime errors:");
    for (const e of errors) console.error(`  ${e}`);
    failed = true;
  } else {
    console.log("[validate:visual] no runtime errors");
  }
} catch (err) {
  console.error("[validate:visual] failed:", err?.stack || err);
  failed = true;
} finally {
  try {
    if (browser) await browser.close();
  } catch {}
  try {
    server.httpServer?.close();
  } catch {}
}

// Vite's preview server keeps the event loop alive; force-exit so the script
// returns immediately with the right status code.
process.exit(failed ? 1 : 0);
