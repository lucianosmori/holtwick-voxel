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

  // Pixel-content assert: copy canvas#game (downsampled) into an offscreen
  // 2D canvas, sample `getImageData`, and bin colors at 5-bit-per-channel
  // resolution. If a single bin holds >SOLID_FRAC of the frame, the frame is
  // effectively a solid color — catches the silent-blank regression we hit at
  // iter 13 even when the console is clean. We sample the whole frame (not
  // just a center patch) so that walls/player/NPC variance keeps the false-
  // positive margin healthy as textures land in later iters.
  const SOLID_FRAC = 0.99;
  const pixelStats = await page.evaluate(() => {
    const c = document.querySelector("canvas#game");
    if (!c) return { error: "no canvas#game in DOM" };
    const cw = c.width, ch = c.height;
    if (!cw || !ch) return { error: `canvas has zero size ${cw}x${ch}` };
    // Downsample the long edge to ~512px; preserves color variance, keeps
    // getImageData allocations small.
    const maxEdge = 512;
    const scale = Math.min(1, maxEdge / Math.max(cw, ch));
    const w = Math.max(1, Math.round(cw * scale));
    const h = Math.max(1, Math.round(ch * scale));
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const ctx = off.getContext("2d");
    if (!ctx) return { error: "no 2D context" };
    ctx.drawImage(c, 0, 0, cw, ch, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const bins = new Map();
    const total = w * h;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] >> 3;
      const g = data[i + 1] >> 3;
      const b = data[i + 2] >> 3;
      const key = (r << 10) | (g << 5) | b;
      bins.set(key, (bins.get(key) ?? 0) + 1);
    }
    let topKey = 0, topCount = 0;
    for (const [k, v] of bins) if (v > topCount) { topCount = v; topKey = k; }
    const r5 = (topKey >> 10) & 0x1f, g5 = (topKey >> 5) & 0x1f, b5 = topKey & 0x1f;
    const topRgb = [r5 << 3, g5 << 3, b5 << 3];
    return { total, topCount, uniqueBins: bins.size, topRgb, sample: { w, h, cw, ch } };
  });
  if (pixelStats?.error) {
    console.error(`[validate:visual] pixel-content check failed: ${pixelStats.error}`);
    failed = true;
  } else {
    const { total, topCount, uniqueBins, topRgb, sample } = pixelStats;
    const frac = topCount / total;
    console.log(
      `[validate:visual] pixel-content: ${sample.cw}x${sample.ch} -> ${sample.w}x${sample.h} ` +
      `top-bin ${(frac * 100).toFixed(2)}% rgb~${topRgb.join(",")} (${uniqueBins} bins)`
    );
    if (frac > SOLID_FRAC) {
      console.error(
        `[validate:visual] frame is >${(SOLID_FRAC * 100).toFixed(0)}% a single color — ` +
        `likely a silent-blank regression (preserveDrawingBuffer? RAF? black clear?)`
      );
      failed = true;
    }
  }

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
