// scripts/test-dialog.mjs
//
// Playwright regression suite for the NPC dialog. Catches:
//   - the "hllo" typing bug (KeyE eaten by interact handler while input focused)
//   - proxy /health reachability + cold-start headroom
//   - dialog open/send/close end-to-end (greeting + user + reply bubbles)
//
// Run via `npm run test:dialog`. Requires a prior `npm run build` so dist/ is
// populated; the script boots `vite preview` and exits non-zero on any
// assertion failure or runtime error.

import { chromium } from "playwright";
import { preview } from "vite";
import { mkdirSync } from "node:fs";
import { setTimeout as wait } from "node:timers/promises";

const PORT = Number(process.env.PORT ?? 4174);
const URL = `http://localhost:${PORT}/?test=1`;
const PROXY_BASE = "https://holtwick-llm.lucianosmori.workers.dev";

mkdirSync("artifacts/screenshots", { recursive: true });

const failures = [];
function check(name, cond, detail) {
  if (cond) {
    console.log(`  ok   ${name}`);
  } else {
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    failures.push(name);
  }
}

console.log(`[test:dialog] booting vite preview on :${PORT}`);
const server = await preview({
  preview: { port: PORT, strictPort: true, host: "127.0.0.1" },
});

let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`console.error: ${msg.text()}`);
  });

  await page.goto(URL, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForFunction(
    () => !!document.querySelector("canvas#game[data-engine]") && !!(window).__voxelTest__,
    { timeout: 10000, polling: 100 },
  );
  await wait(500);

  console.log("[test:dialog] === proxy reachability ===");
  const health = await page.evaluate(async (base) => {
    try {
      const t0 = performance.now();
      const r = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) });
      const j = await r.json();
      return { ok: r.ok, status: r.status, ms: Math.round(performance.now() - t0), body: j };
    } catch (e) {
      return { ok: false, error: String(e?.message || e) };
    }
  }, PROXY_BASE);
  check("proxy /health responds 200", health.ok && health.status === 200, JSON.stringify(health));
  check("proxy /health under 2s warm", health.ms !== undefined && health.ms < 2000, `${health.ms}ms`);

  console.log("[test:dialog] === dialog open via __voxelTest__ hook ===");
  await page.evaluate(() => (window).__voxelTest__.openDialog());
  await page.waitForFunction(
    () => document.querySelector("#dialog-backdrop")?.classList.contains("show"),
    { timeout: 3000 },
  );
  check("dialog-backdrop has .show", true);
  const greetings = await page.locator("#chat-messages .chat-msg").count();
  check("greeting bubble appended", greetings >= 1, `count=${greetings}`);

  console.log("[test:dialog] === typing-bug regression (hello must stay hello) ===");
  // The bug: pressing "e" used to trigger the interact handler's preventDefault
  // even when the input was focused, dropping the "e" from any word containing
  // it. Type letter-by-letter via the real keyboard so the KeyE bubble bubbles
  // up to the window listener exactly the way a player's keystroke does.
  await page.focus("#chat-input");
  await page.evaluate(() => {
    const i = document.querySelector("#chat-input");
    i.value = "";
  });
  await page.keyboard.type("hello", { delay: 20 });
  const typed = await page.locator("#chat-input").inputValue();
  check("typed 'hello' matches input value", typed === "hello", `got "${typed}"`);

  // Also verify pressing E on its own doesn't re-open / spuriously act when
  // the input is focused.
  await page.keyboard.type("e-key trap");
  const typedTrap = await page.locator("#chat-input").inputValue();
  check(
    "typing 'e-key trap' after 'hello' yields 'helloe-key trap'",
    typedTrap === "helloe-key trap",
    `got "${typedTrap}"`,
  );

  console.log("[test:dialog] === send + reply (proxy or scripted bark) ===");
  // Clear and send a clean message via the send button so the streaming path
  // gets exercised. Direct DOM .click() sidesteps Playwright's topmost-element
  // check (full-viewport canvas confuses it).
  await page.evaluate(() => {
    const i = document.querySelector("#chat-input");
    const b = document.querySelector("#chat-send");
    i.value = "Hello, friend.";
    b.click();
  });
  let replyText = "";
  try {
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
    replyText = await page.evaluate(() => {
      const msgs = document.querySelectorAll("#chat-messages .chat-msg");
      return (msgs[msgs.length - 1]?.textContent ?? "").trim();
    });
    check("3rd bubble (assistant reply) populated", replyText.length > 0, `text="${replyText.slice(0, 80)}"`);
  } catch (err) {
    check("3rd bubble (assistant reply) populated", false, err?.message);
  }

  await page.screenshot({ path: "artifacts/screenshots/test-dialog.png", fullPage: true });

  console.log("[test:dialog] === close via Escape ===");
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () => !document.querySelector("#dialog-backdrop.show"),
    { timeout: 3000 },
  );
  check("Escape closes dialog", true);

  console.log("[test:dialog] === no console errors ===");
  // WebGPU-unavailable warning is expected in headless Chromium; filter it.
  const realErrors = consoleErrors.filter(
    (e) => !/WebGPU/i.test(e) && !/MLC/i.test(e) && !/scripted bark/i.test(e),
  );
  check("no unexpected console errors", realErrors.length === 0, realErrors.join(" | "));
} catch (err) {
  console.error("[test:dialog] uncaught:", err?.stack || err);
  failures.push("uncaught");
} finally {
  try { if (browser) await browser.close(); } catch {}
  try { server.httpServer?.close(); } catch {}
}

if (failures.length) {
  console.error(`\n[test:dialog] ${failures.length} failure(s): ${failures.join(", ")}`);
  process.exit(1);
}
console.log("\n[test:dialog] all checks passed");
process.exit(0);
