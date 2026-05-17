// scripts/capture-showcase.mjs
//
// Boots `vite preview` and captures the 4 README hero shots:
//   1. showcase-village-day.png       — fresh village at noon
//   2. showcase-dialog.png            — Edda dialog open with a streamed reply
//   3. showcase-inventory.png         — inventory modal populated with stacks
//   4. showcase-night-lanterns.png    — village at midnight with lanterns lit
//
// Each scene reloads with the URL params it needs (default vs `dayNight=0.5`)
// so the `?dayNight=` override locks the sun position deterministically.
//
// Run via `node scripts/capture-showcase.mjs`. Requires a prior `npm run build`
// so dist/ is populated. Outputs land in `artifacts/screenshots/`.

import { chromium } from "playwright";
import { preview } from "vite";
import { mkdirSync } from "node:fs";
import { setTimeout as wait } from "node:timers/promises";

const PORT = Number(process.env.PORT ?? 4175);
const BASE = `http://localhost:${PORT}`;
const OUT_DIR = "artifacts/screenshots";

mkdirSync(OUT_DIR, { recursive: true });

async function bootPage(browser, query) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const url = `${BASE}/?${query}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForFunction(
    () => {
      const c = document.querySelector("canvas#game");
      return !!c && c.hasAttribute("data-engine") && !!(window).__voxelTest__;
    },
    { timeout: 10000, polling: 100 },
  );
  await wait(600);
  return page;
}

console.log(`[showcase] booting vite preview on :${PORT}`);
const server = await preview({
  preview: { port: PORT, strictPort: true, host: "127.0.0.1" },
});

let failed = false;
let browser;
try {
  browser = await chromium.launch();

  // 1. Village at noon — default `?test=1` locks the sun via no override but
  // the dayNight cycle starts at phase 0 (= noon) so this captures fresh day.
  {
    const page = await bootPage(browser, "test=1&dayNight=0");
    const shot = `${OUT_DIR}/showcase-village-day.png`;
    await page.screenshot({ path: shot, fullPage: true });
    console.log(`[showcase] ${shot}`);
    await page.close();
  }

  // 2. Dialog modal — open Edda + send a message + wait for the reply bubble.
  {
    const page = await bootPage(browser, "test=1&dayNight=0");
    await page.evaluate(() => (window).__voxelTest__.openDialog("edda"));
    await page.waitForFunction(
      () => document.querySelector("#dialog-backdrop")?.classList.contains("show"),
      { timeout: 3000 },
    );
    await page.evaluate(() => {
      const input = document.querySelector("#chat-input");
      const btn = document.querySelector("#chat-send");
      input.value = "Tell me about Holtwick.";
      btn.click();
    });
    await page.waitForFunction(
      () => {
        const msgs = document.querySelectorAll("#chat-messages .chat-msg");
        if (msgs.length < 3) return false;
        const last = msgs[msgs.length - 1];
        const txt = (last?.textContent ?? "").trim();
        return txt.length > 0 && txt !== "…";
      },
      { timeout: 30000, polling: 200 },
    );
    const shot = `${OUT_DIR}/showcase-dialog.png`;
    await page.screenshot({ path: shot, fullPage: true });
    console.log(`[showcase] ${shot}`);
    await page.close();
  }

  // 3. Inventory modal — seed a few stacks via the test hook so the grid
  // renders populated slots instead of 12 dashed-border empties.
  {
    const page = await bootPage(browser, "test=1&dayNight=0");
    await page.evaluate(() => {
      const hook = (window).__voxelTest__;
      hook.addItem("gold_coin", 12);
      hook.addItem("health_potion", 3);
      hook.addItem("iron_ore", 5);
    });
    await page.keyboard.press("KeyI");
    await page.waitForFunction(
      () => document.querySelector("#inventory-backdrop")?.classList.contains("show"),
      { timeout: 3000 },
    );
    await wait(150);
    const shot = `${OUT_DIR}/showcase-inventory.png`;
    await page.screenshot({ path: shot, fullPage: true });
    console.log(`[showcase] ${shot}`);
    await page.close();
  }

  // 4. Night with lanterns — `?dayNight=0.5` locks midnight so the 4
  // PointLights ramp to full intensity and the warm pools read against
  // the cool moonlit hemisphere.
  {
    const page = await bootPage(browser, "test=1&dayNight=0.5");
    const shot = `${OUT_DIR}/showcase-night-lanterns.png`;
    await page.screenshot({ path: shot, fullPage: true });
    console.log(`[showcase] ${shot}`);
    await page.close();
  }
} catch (err) {
  console.error("[showcase] failed:", err?.stack || err);
  failed = true;
} finally {
  try {
    if (browser) await browser.close();
  } catch {}
  try {
    server.httpServer?.close();
  } catch {}
}

process.exit(failed ? 1 : 0);
