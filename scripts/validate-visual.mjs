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
  // Canvas#game is in the static HTML; Three.js mounts to it after JS evaluates.
  // Poll for the data-engine attribute as the readiness signal instead of
  // page.waitForSelector — the latter has flaked on stable-but-changing canvases
  // since the 64x64 village landed.
  await page.waitForFunction(
    () => {
      const c = document.querySelector("canvas#game");
      return !!c && c.hasAttribute("data-engine");
    },
    { timeout: 10000, polling: 100 },
  );
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
  await page.screenshot({ path: shotPath, fullPage: true, timeout: 60000 });
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

  // Dialog wiring assert (P4.2): open the modal via the `?test=1` hook, send
  // a message, and wait for a 3rd `.chat-msg` (greeting + user + assistant
  // reply). Headless Chromium pulls the reply from the Cloudflare/Groq proxy
  // (or the scripted-bark offline fallback if the proxy is unreachable).
  try {
    const hookReady = await page.evaluate(() => !!(window).__voxelTest__);
    if (!hookReady) throw new Error("window.__voxelTest__ missing — main.ts `?test=1` gate?");
    const openResult = await page.evaluate(() => {
      try {
        (window).__voxelTest__.openDialog();
        return { ok: true, show: document.querySelector("#dialog-backdrop")?.classList.contains("show") };
      } catch (e) {
        return { ok: false, err: String(e?.stack || e) };
      }
    });
    if (!openResult.ok) throw new Error(`openDialog() threw: ${openResult.err}`);
    if (!openResult.show) throw new Error("openDialog() ran but dialog-backdrop.show not set");
    // Set the input value + click via evaluate — Playwright's `click()` waits
    // for the target to be topmost at the click point, and the full-viewport
    // <canvas#game> intermittently confuses that check even though the modal
    // is z-index:100 above it. Direct DOM dispatch sidesteps the issue.
    await page.evaluate(() => {
      const input = document.querySelector("#chat-input");
      const btn = document.querySelector("#chat-send");
      input.value = "Hello, Edda.";
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
    const dialogShot = `artifacts/screenshots/iter-${ITER}-dialog.png`;
    await page.screenshot({ path: dialogShot, fullPage: true });
    console.log(`[validate:visual] dialog screenshot -> ${dialogShot}`);
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () => !document.querySelector("#dialog-backdrop.show"),
      { timeout: 3000 },
    );
    console.log("[validate:visual] dialog open/send/close OK");
  } catch (err) {
    console.error("[validate:visual] dialog wiring assert failed:", err?.message || err);
    failed = true;
  }

  // P6.1 quest flow: Edda offers "Find Aldric", player accepts, walks to
  // Aldric (here: opens his dialog via the test hook), quest auto-completes,
  // +10 gold awarded.
  try {
    await page.evaluate(() => (window).__voxelTest__.openDialog("edda"));
    await page.waitForFunction(
      () => document.querySelector("#dialog-backdrop")?.classList.contains("show"),
      { timeout: 3000 },
    );
    const acceptVisible = await page.evaluate(() => {
      const row = document.querySelector("#dialog-quest-row");
      return !!row && row.classList.contains("show");
    });
    if (!acceptVisible) throw new Error("Edda dialog did not show accept-quest row");

    await page.evaluate(() =>
      document.querySelector("#dialog-quest-accept").click(),
    );
    const afterAccept = await page.evaluate(() =>
      (window).__voxelTest__.getQuestState("edda_find_aldric"),
    );
    if (afterAccept?.status !== "in_progress") {
      throw new Error(
        `quest not in_progress after accept, got ${JSON.stringify(afterAccept)}`,
      );
    }

    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () => !document.querySelector("#dialog-backdrop.show"),
      { timeout: 3000 },
    );

    await page.evaluate(() => (window).__voxelTest__.openDialog("aldric"));
    await page.waitForFunction(
      () => document.querySelector("#dialog-backdrop")?.classList.contains("show"),
      { timeout: 3000 },
    );
    const afterTalk = await page.evaluate(() =>
      (window).__voxelTest__.getQuestState("edda_find_aldric"),
    );
    const gold = await page.evaluate(() => (window).__voxelTest__.getGold());
    if (afterTalk?.status !== "complete") {
      throw new Error(
        `quest not complete after talking to aldric, got ${JSON.stringify(afterTalk)}`,
      );
    }
    if (gold !== 10) throw new Error(`gold should be 10, got ${gold}`);

    const questShot = `artifacts/screenshots/iter-${ITER}-quest.png`;
    await page.screenshot({ path: questShot, fullPage: true });
    console.log(`[validate:visual] quest screenshot -> ${questShot}`);

    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () => !document.querySelector("#dialog-backdrop.show"),
      { timeout: 3000 },
    );
    console.log("[validate:visual] P6.1 quest flow OK (edda → accept → aldric → +10 gold)");

    // P6.2 HUD: gold counter + quest log must reflect the just-completed quest.
    const hud = await page.evaluate(() => {
      const root = document.querySelector("#hud");
      if (!root) return { error: "no #hud in DOM" };
      const gold = document.querySelector("#hud-gold")?.textContent?.trim() ?? "";
      const count = document.querySelector("#hud-quest-count")?.textContent?.trim() ?? "";
      const rows = Array.from(document.querySelectorAll("#hud-quest-list .hud-quest"))
        .map((el) => el.textContent?.trim() ?? "");
      const visible = window.getComputedStyle(root).display !== "none";
      return { visible, gold, count, rows };
    });
    if (hud?.error) throw new Error(`HUD check: ${hud.error}`);
    if (!hud.visible) throw new Error("HUD #hud is not visible");
    if (hud.gold !== "Gold: 10") throw new Error(`HUD gold expected "Gold: 10", got "${hud.gold}"`);
    if (hud.count !== "Quests (1)") throw new Error(`HUD count expected "Quests (1)", got "${hud.count}"`);
    if (hud.rows.length !== 1 || !hud.rows[0].startsWith("[done] ") || !hud.rows[0].includes("Find Aldric")) {
      throw new Error(`HUD row expected "[done] Find Aldric", got ${JSON.stringify(hud.rows)}`);
    }
    console.log(`[validate:visual] P6.2 HUD OK (${hud.gold} · ${hud.count} · "${hud.rows[0]}")`);
  } catch (err) {
    console.error("[validate:visual] quest flow assert failed:", err?.message || err);
    failed = true;
  }

  // P6.3 item pickup flow: warp the player onto the first un-picked world
  // item, wait a frame, assert inventory state reflects the pickup and the
  // world item entry flips to picked=true.
  try {
    const spawns = await page.evaluate(() => (window).__voxelTest__.getItemWorldPositions());
    if (!Array.isArray(spawns) || spawns.length === 0) {
      throw new Error("getItemWorldPositions returned no spawns");
    }
    const target = spawns.find((s) => !s.picked);
    if (!target) throw new Error("all spawned items already picked at boot");
    const beforeCount = await page.evaluate(
      (id) => (window).__voxelTest__.getItemCount(id),
      target.item_id,
    );
    await page.evaluate(
      ({ x, z }) => (window).__voxelTest__.movePlayerTo(x, z),
      { x: target.x, z: target.z },
    );
    // Let RAF fire so checkPickups() runs after the warp.
    await page.waitForFunction(
      (id) => (window).__voxelTest__.getItemCount(id) > 0,
      target.item_id,
      { timeout: 3000, polling: 50 },
    );
    const afterCount = await page.evaluate(
      (id) => (window).__voxelTest__.getItemCount(id),
      target.item_id,
    );
    if (afterCount <= beforeCount) {
      throw new Error(
        `pickup did not increment count for ${target.item_id}: ${beforeCount} → ${afterCount}`,
      );
    }
    const stillThere = await page.evaluate(
      ({ x, z }) => {
        const list = (window).__voxelTest__.getItemWorldPositions();
        return list.some((s) => !s.picked && Math.abs(s.x - x) < 0.01 && Math.abs(s.z - z) < 0.01);
      },
      { x: target.x, z: target.z },
    );
    if (stillThere) throw new Error("item still un-picked after pickup window");
    const inv = await page.evaluate(() => (window).__voxelTest__.getInventory());
    const stack = Array.isArray(inv) ? inv.find((s) => s.item_id === target.item_id) : null;
    if (!stack || stack.count < afterCount) {
      throw new Error(
        `inventory does not reflect pickup: ${JSON.stringify(inv)} for ${target.item_id}`,
      );
    }
    const pickupShot = `artifacts/screenshots/iter-${ITER}-pickup.png`;
    await page.screenshot({ path: pickupShot, fullPage: true });
    console.log(`[validate:visual] pickup screenshot -> ${pickupShot}`);
    console.log(
      `[validate:visual] P6.3 pickup OK (${target.item_id} count ${beforeCount} → ${afterCount}, spawns=${spawns.length})`,
    );
  } catch (err) {
    console.error("[validate:visual] pickup flow assert failed:", err?.message || err);
    failed = true;
  }

  // P6.4 inventory modal: `I` opens it, typing into chat input + pressing `I`
  // does NOT open it (gate test). Assumes the P6.3 pickup test ran first so
  // there is at least one populated stack to render.
  try {
    await page.keyboard.press("KeyI");
    await page.waitForFunction(
      () => document.querySelector("#inventory-backdrop")?.classList.contains("show"),
      { timeout: 3000 },
    );
    const slotInfo = await page.evaluate(() => {
      const slots = document.querySelectorAll("#inventory-grid .inv-slot");
      const populated = document.querySelectorAll(
        "#inventory-grid .inv-slot:not(.inv-slot-empty)",
      ).length;
      return { count: slots.length, populated };
    });
    if (slotInfo.count !== 12) {
      throw new Error(`expected 12 inventory slots, got ${slotInfo.count}`);
    }
    if (slotInfo.populated < 1) {
      throw new Error(
        `expected ≥1 populated slot after pickup test, got ${slotInfo.populated}`,
      );
    }
    const invShot = `artifacts/screenshots/iter-${ITER}-inventory.png`;
    await page.screenshot({ path: invShot, fullPage: true });
    console.log(`[validate:visual] inventory screenshot -> ${invShot}`);

    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () => !document.querySelector("#inventory-backdrop.show"),
      { timeout: 3000 },
    );

    // Gate test: open dialog → focus chat-input → press `I` → inventory must
    // stay closed AND the `i` must land in the input.
    await page.evaluate(() => (window).__voxelTest__.openDialog());
    await page.waitForFunction(
      () => document.querySelector("#dialog-backdrop")?.classList.contains("show"),
      { timeout: 3000 },
    );
    await page.focus("#chat-input");
    await page.evaluate(() => {
      document.querySelector("#chat-input").value = "";
    });
    await page.keyboard.press("KeyI");
    const inputVal = await page.locator("#chat-input").inputValue();
    const invOpenWhileTyping = await page.evaluate(
      () => !!document.querySelector("#inventory-backdrop.show"),
    );
    if (invOpenWhileTyping) {
      throw new Error("inventory opened while typing 'i' into chat input");
    }
    if (inputVal !== "i") {
      throw new Error(`expected chat input "i" after KeyI, got "${inputVal}"`);
    }
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () => !document.querySelector("#dialog-backdrop.show"),
      { timeout: 3000 },
    );
    console.log(
      `[validate:visual] P6.4 inventory OK (12 slots, ${slotInfo.populated} populated, gated by chat input)`,
    );
  } catch (err) {
    console.error("[validate:visual] inventory flow assert failed:", err?.message || err);
    failed = true;
  }

  // P6.5 save/load: after the quest/pickup/inventory flow above, force-flush
  // the save and reload the page. Restored state must include the completed
  // quest + 10 gold + the picked-up item stack. Done-when criterion from
  // IMPLEMENTATION_PLAN.md: "Playwright accepts a quest, navigates the page
  // to the same URL (forced reload), asserts the quest log shows the
  // accepted quest after reload."
  try {
    const preReload = await page.evaluate(() => {
      const hook = (window).__voxelTest__;
      hook.flushSave();
      return {
        gold: hook.getGold(),
        questStatus: hook.getQuestState("edda_find_aldric")?.status,
        inventory: hook.getInventory(),
      };
    });
    if (preReload.questStatus !== "complete") {
      throw new Error(`pre-reload quest status expected complete, got ${preReload.questStatus}`);
    }
    if (preReload.gold !== 10) {
      throw new Error(`pre-reload gold expected 10, got ${preReload.gold}`);
    }
    if (!Array.isArray(preReload.inventory) || preReload.inventory.length === 0) {
      throw new Error(`pre-reload inventory should be populated, got ${JSON.stringify(preReload.inventory)}`);
    }

    await page.reload({ waitUntil: "networkidle", timeout: 20000 });
    await page.waitForFunction(
      () => {
        const c = document.querySelector("canvas#game");
        return !!c && c.hasAttribute("data-engine") && !!(window).__voxelTest__;
      },
      { timeout: 10000, polling: 100 },
    );
    await wait(400);

    const restored = await page.evaluate(() => {
      const hook = (window).__voxelTest__;
      return {
        gold: hook.getGold(),
        questStatus: hook.getQuestState("edda_find_aldric")?.status,
        inventory: hook.getInventory(),
      };
    });
    if (restored.questStatus !== "complete") {
      throw new Error(`post-reload quest status expected complete, got ${restored.questStatus}`);
    }
    if (restored.gold !== 10) {
      throw new Error(`post-reload gold expected 10, got ${restored.gold}`);
    }
    const expectedStack = preReload.inventory[0];
    const restoredStack = restored.inventory.find((s) => s.item_id === expectedStack.item_id);
    if (!restoredStack || restoredStack.count !== expectedStack.count) {
      throw new Error(
        `post-reload inventory mismatch for ${expectedStack.item_id}: ` +
          `expected ${expectedStack.count}, got ${JSON.stringify(restoredStack)}`,
      );
    }

    const hudAfter = await page.evaluate(() => ({
      gold: document.querySelector("#hud-gold")?.textContent?.trim() ?? "",
      count: document.querySelector("#hud-quest-count")?.textContent?.trim() ?? "",
      rows: Array.from(document.querySelectorAll("#hud-quest-list .hud-quest"))
        .map((el) => el.textContent?.trim() ?? ""),
    }));
    if (hudAfter.gold !== "Gold: 10") {
      throw new Error(`post-reload HUD gold expected "Gold: 10", got "${hudAfter.gold}"`);
    }
    if (hudAfter.count !== "Quests (1)") {
      throw new Error(`post-reload HUD count expected "Quests (1)", got "${hudAfter.count}"`);
    }
    if (hudAfter.rows.length !== 1 || !hudAfter.rows[0].includes("Find Aldric")) {
      throw new Error(`post-reload HUD rows expected the completed quest, got ${JSON.stringify(hudAfter.rows)}`);
    }

    const reloadShot = `artifacts/screenshots/iter-${ITER}-reload.png`;
    await page.screenshot({ path: reloadShot, fullPage: true });
    console.log(`[validate:visual] reload screenshot -> ${reloadShot}`);
    console.log(
      `[validate:visual] P6.5 save/load OK (quest=${restored.questStatus}, gold=${restored.gold}, ` +
        `inv=${restored.inventory.length} stack(s) survived reload)`,
    );

    // Clean up so a re-run on the same chromium profile doesn't carry the
    // save into the next iter's fresh-boot expectations.
    await page.evaluate(() => (window).__voxelTest__.clearSave());
  } catch (err) {
    console.error("[validate:visual] save/load flow assert failed:", err?.message || err);
    failed = true;
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
