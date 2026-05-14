#!/usr/bin/env node
/**
 * tools/genSprites.mjs — PixelLab pixflux NPC sprite generator (P3.1).
 *
 * For each NPC in src/data/npcs/*.json, calls PixelLab's
 * /create-character-with-4-directions endpoint and writes
 * public/sprites/<npc_id>_<dir>.png for dir in {south,west,north,east}.
 *
 * Auth source (first hit wins):
 *   - env PIXELLAB_API_KEY
 *   - env PIXELLAB_TOKEN
 *   - file ~/.pixellab-token (legacy validated path)
 *
 * Defaults:
 *   - skip-if-exists per NPC (all 4 directions present) — safe to re-run
 *   - 1500 ms sleep between requests (rate-limit politeness)
 *   - 64×64 image size, no_background=true so the billboard plane shows
 *     the world behind the sprite
 *
 * Flags:
 *   --force        regenerate even if all 4 direction PNGs exist
 *   --only <id>    run for a single NPC id (smoke test)
 *   --max <n>      stop after generating n NPCs (post-skip)
 *   --dry-run      print the prompt + skip status, do not call API
 *   --sleep <ms>   override inter-request sleep (default 1500)
 *
 * Run instructions are documented in NOTES.md under "P3.1 sprite generation".
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { setTimeout as sleep } from "node:timers/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const NPC_DIR = join(REPO_ROOT, "src", "data", "npcs");
const OUT_DIR = join(REPO_ROOT, "public", "sprites");

const PIXELLAB_BASE = "https://api.pixellab.ai/v2";
const DIRECTIONS = ["south", "west", "north", "east"];

const STYLE_ANCHOR =
  "fantasy RPG pixel art, top-down 3/4 view character sprite, " +
  "soft pixel outline, vibrant warm palette consistent across the set, " +
  "clean transparent background, single character centered";

// ----------------------------------------------------------
// CLI
// ----------------------------------------------------------
function parseArgs(argv) {
  const out = { force: false, only: null, max: Infinity, dryRun: false, sleepMs: 1500 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--force") out.force = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--only") out.only = argv[++i];
    else if (a === "--max") out.max = Number(argv[++i]);
    else if (a === "--sleep") out.sleepMs = Number(argv[++i]);
    else throw new Error(`unknown flag: ${a}`);
  }
  return out;
}

// ----------------------------------------------------------
// Auth
// ----------------------------------------------------------
function loadToken() {
  const fromEnv = process.env.PIXELLAB_API_KEY || process.env.PIXELLAB_TOKEN;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  const tokenFile = join(homedir(), ".pixellab-token");
  if (existsSync(tokenFile)) {
    const t = readFileSync(tokenFile, "utf8").trim();
    if (t) return t;
  }
  throw new Error(
    "no PixelLab credentials. Set PIXELLAB_API_KEY or write the token to ~/.pixellab-token",
  );
}

// ----------------------------------------------------------
// NPC loading (Node-direct, bypasses the Vite-only npcs.ts loader)
// ----------------------------------------------------------
function loadNpcs() {
  const files = readdirSync(NPC_DIR).filter((f) => f.endsWith(".json")).sort();
  const npcs = [];
  for (const file of files) {
    const raw = readFileSync(join(NPC_DIR, file), "utf8");
    const def = JSON.parse(raw);
    if (!def.id || !def.name || !def.role) {
      throw new Error(`malformed NPC at ${file}: missing id/name/role`);
    }
    npcs.push(def);
  }
  return npcs;
}

// ----------------------------------------------------------
// Prompt builder — name + role + extracted visual cues from barks
// ----------------------------------------------------------
function describeNpc(npc) {
  const cues = (npc.barks_idle || []).concat(npc.barks_combat || []).join(" ");
  // Pull obvious visual props from the barks (cheap heuristic).
  const props = [];
  if (/pickaxe/i.test(cues)) props.push("pickaxe");
  if (/censer|ash|dust/i.test(cues)) props.push("smoking ash censer");
  if (/lantern|wisp/i.test(cues)) props.push("glowing lantern");
  if (/bone|skull|tomb|crypt/i.test(cues)) props.push("bone trinkets");
  if (/sword|blade|knight/i.test(cues)) props.push("sword");
  if (/bow|arrow|archer/i.test(cues)) props.push("bow and arrows");
  if (/spider|web/i.test(cues)) props.push("multiple legs and fangs");
  if (/banshee|wail|ghost|wraith|shadow|void/i.test(cues)) props.push("translucent wisp form");
  if (/slime|ooze/i.test(cues)) props.push("gelatinous body");
  if (/cult|hood|cowl|priest/i.test(cues)) props.push("hooded robe");
  if (/demon|hell|infernal/i.test(cues)) props.push("clawed limbs and horns");
  if (/mage|spell|rune/i.test(cues)) props.push("runic staff");
  if (/scribe|tome|book|scroll/i.test(cues)) props.push("open tome");
  if (/beetle|carapace|rust/i.test(cues)) props.push("hard carapace");
  if (/bat/i.test(cues)) props.push("leathery wings");
  if (/rat|whiskers|gnaw/i.test(cues)) props.push("twitching whiskers");
  if (/dog|hound/i.test(cues)) props.push("four-legged beast with glowing eyes");
  if (/pilgrim|wander/i.test(cues)) props.push("travel cloak and walking staff");
  if (/kobold|scout/i.test(cues)) props.push("scaly reptilian skin");
  if (/zombie|undead|corpse|ghoul/i.test(cues)) props.push("rotting flesh");
  if (/fungal|spore|mushroom/i.test(cues)) props.push("fungal growths on body");
  return {
    descriptor: `${npc.name}, ${npc.role}${props.length ? `, ${props.join(", ")}` : ""}`,
    description: `${STYLE_ANCHOR}. ${npc.name}, ${npc.role}${props.length ? `, with ${props.join(", ")}` : ""}.`,
  };
}

// ----------------------------------------------------------
// PixelLab REST call
// ----------------------------------------------------------
async function pixellabCall(path, body, token) {
  const res = await fetch(PIXELLAB_BASE + path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "<no body>");
    throw new Error(`PixelLab HTTP ${res.status}: ${errText.slice(0, 400)}`);
  }
  return res.json();
}

function decodeImage(field) {
  if (!field) return null;
  let b64 = field.base64 || field.image_base64 || field;
  if (typeof b64 !== "string") return null;
  if (b64.startsWith("data:") && b64.includes(",")) b64 = b64.split(",", 2)[1];
  return Buffer.from(b64, "base64");
}

async function generateForNpc(npc, token) {
  const { description } = describeNpc(npc);
  const body = {
    description,
    image_size: { width: 64, height: 64 },
  };
  const r = await pixellabCall("/create-character-with-4-directions", body, token);
  const images = r.images || (r.data && r.data.images) || {};
  if (typeof images !== "object" || Array.isArray(images)) {
    throw new Error(`unexpected response shape: ${JSON.stringify(r).slice(0, 300)}`);
  }
  const written = {};
  for (const dir of DIRECTIONS) {
    const buf = decodeImage(images[dir]);
    if (!buf) {
      throw new Error(`missing ${dir} image in response for ${npc.id}`);
    }
    const target = join(OUT_DIR, `${npc.id}_${dir}.png`);
    writeFileSync(target, buf);
    written[dir] = target;
  }
  return written;
}

// ----------------------------------------------------------
// Main
// ----------------------------------------------------------
function hasAllDirections(npcId) {
  return DIRECTIONS.every((d) => existsSync(join(OUT_DIR, `${npcId}_${d}.png`)));
}

async function main() {
  const args = parseArgs(process.argv);
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const all = loadNpcs();
  const queue = args.only ? all.filter((n) => n.id === args.only) : all;
  if (args.only && queue.length === 0) throw new Error(`no NPC with id "${args.only}"`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;
  const token = args.dryRun ? null : loadToken();

  console.error(`[genSprites] ${queue.length} NPCs queued, out=${OUT_DIR}`);

  for (const npc of queue) {
    if (!args.force && hasAllDirections(npc.id)) {
      skipped++;
      console.error(`[skip] ${npc.id} (all 4 directions present)`);
      continue;
    }
    if (generated >= args.max) {
      console.error(`[stop] reached --max ${args.max}`);
      break;
    }
    const { description } = describeNpc(npc);
    console.error(`[gen ] ${npc.id} :: ${description.slice(0, 110)}…`);
    if (args.dryRun) {
      generated++;
      continue;
    }
    try {
      const written = await generateForNpc(npc, token);
      generated++;
      console.error(`[ok  ] ${npc.id} -> ${Object.values(written).map((p) => p.split(/[\\/]/).pop()).join(", ")}`);
    } catch (err) {
      failed++;
      console.error(`[fail] ${npc.id}: ${err.message}`);
    }
    if (generated < args.max && queue.indexOf(npc) < queue.length - 1) {
      await sleep(args.sleepMs);
    }
  }

  console.error(`[done] generated=${generated} skipped=${skipped} failed=${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(`[fatal] ${err.message}`);
  process.exit(2);
});
