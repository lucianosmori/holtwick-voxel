import { readdirSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseNpcDef } from "../src/data/npc.schema.ts";

const here = dirname(fileURLToPath(import.meta.url));
const npcsDir = resolve(here, "..", "src", "data", "npcs");

const files = readdirSync(npcsDir).filter((f) => f.endsWith(".json")).sort();
const seen = new Set<string>();
let failed = 0;

for (const file of files) {
  const path = join(npcsDir, file);
  try {
    const raw = JSON.parse(readFileSync(path, "utf8"));
    const def = parseNpcDef(`./npcs/${file}`, raw);
    if (seen.has(def.id)) {
      console.error(`duplicate id "${def.id}" in ${file}`);
      failed++;
      continue;
    }
    seen.add(def.id);
  } catch (err) {
    console.error(`${file}: ${(err as Error).message}`);
    failed++;
  }
}

const EXPECTED = 31;
if (files.length !== EXPECTED) {
  console.error(`expected ${EXPECTED} NPC files, found ${files.length}`);
  process.exit(1);
}
if (failed > 0) {
  console.error(`${failed} NPC file(s) failed validation`);
  process.exit(1);
}

console.log(`ok: ${files.length} NPCs validated against schema`);
