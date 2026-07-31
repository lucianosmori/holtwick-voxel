// Focused check for the two things the big gate in validate-visual.mjs does
// not cover: the player's carried glow (P10.1) and the bottom-centre interact
// prompt. Boots `vite preview` against dist/ exactly as that gate does, walks
// the day/night ramp, and measures the prompt's on-screen box.
//
//   npm run build && npm run check:ui
import { preview } from "vite";
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const PORT = 4177;
const OUT = "artifacts/screenshots";
mkdirSync(OUT, { recursive: true });

const server = await preview({ preview: { port: PORT, strictPort: true, host: "127.0.0.1" } });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

await page.goto(`http://localhost:${PORT}/?test=1`, { waitUntil: "load" });
// ?test=1 auto-dismisses the title screen (src/ui/title.ts), so the village
// is already up — no need to click through the splash.
await page.waitForFunction(() => !!window.__voxelTest__);
await page.waitForTimeout(2500);

const hook = (fn, arg) => page.evaluate(fn, arg);

// --- glow: intensity across the day, and midnight stills -------------------
const ramp = [];
for (const phase of [0, 0.15, 0.25, 0.5, 0.75, 0.9]) {
  await hook((p) => window.__voxelTest__.setDayNightPhase(p), phase);
  await page.waitForTimeout(120);
  ramp.push({
    phase,
    glow: +(await hook(() => window.__voxelTest__.getPlayerGlowIntensity())).toFixed(3),
    lantern: +(await hook(() => window.__voxelTest__.getLanternIntensities()[0].intensity)).toFixed(3),
  });
}
console.log("phase → glow / lantern intensity:");
ramp.forEach((r) => console.log(`  ${r.phase.toFixed(2)}  glow ${r.glow}  lantern ${r.lantern}`));

// Midnight, out on the dark outskirts where no fixed lantern reaches.
await hook(() => window.__voxelTest__.setDayNightPhase(0.5));
await hook(() => window.__voxelTest__.movePlayerTo(8, 8));
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/glow-midnight-outskirts.png` });

const midnightGlow = await hook(() => window.__voxelTest__.getPlayerGlowIntensity());
console.log("midnight glow intensity =", midnightGlow);

// --- hint: bottom-centre placement ----------------------------------------
const npc = await hook(() => window.__voxelTest__.getNpcPosition("edda"));
await hook(({ x, z }) => window.__voxelTest__.movePlayerTo(x + 1, z), npc);
await page.waitForTimeout(600);
const box = await page.evaluate(() => {
  const h = document.getElementById("hint");
  const r = h.getBoundingClientRect();
  return {
    text: h.textContent,
    shown: h.classList.contains("show"),
    centerX: Math.round(r.left + r.width / 2),
    bottomGap: Math.round(window.innerHeight - r.bottom),
    viewportW: window.innerWidth,
    viewportH: window.innerHeight,
    toastBottomGap: Math.round(window.innerHeight - document.getElementById("toast-container").getBoundingClientRect().bottom),
  };
});
console.log("hint:", JSON.stringify(box));
const centred = Math.abs(box.centerX - box.viewportW / 2) <= 2;
const atBottom = box.bottomGap > 0 && box.bottomGap < 60;
// The toast stack shares the bottom centre; it must sit clear of the prompt.
const toastClear = box.toastBottomGap > box.bottomGap + 30;
console.log(`hint centred=${centred} atBottom=${atBottom} (gap ${box.bottomGap}px) toastClear=${toastClear}`);
await page.screenshot({ path: `${OUT}/hint-bottom-centre.png` });

// Daylight version of the same shot, to confirm the prompt reads on a bright
// background too and that the glow is fully off by day.
await hook(() => window.__voxelTest__.setDayNightPhase(0));
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/hint-bottom-centre-day.png` });

console.log("console/page errors:", errors.length);
errors.forEach((e) => console.log("  " + e));
await browser.close();
await server.close();
// Glow must be dark by day and lit at midnight — a glow stuck on would wash
// out the daylight scene, one stuck off is the bug this change fixes.
const rampOk = ramp[0].glow === 0 && midnightGlow > 0.5;
if (!centred || !atBottom || !toastClear || !rampOk || errors.length) process.exit(1);
console.log("check:ui OK");
