import { parseNpcDef, type NpcDef } from "./npc.schema";

const rawModules = import.meta.glob("./npcs/*.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

function buildRegistry(): NpcDef[] {
  const seen = new Set<string>();
  const defs: NpcDef[] = [];
  for (const [path, raw] of Object.entries(rawModules)) {
    const def = parseNpcDef(path, raw);
    if (seen.has(def.id)) {
      throw new Error(`duplicate NPC id "${def.id}" (in ${path})`);
    }
    seen.add(def.id);
    defs.push(def);
  }
  defs.sort((a, b) => a.id.localeCompare(b.id));
  return defs;
}

const REGISTRY: readonly NpcDef[] = Object.freeze(buildRegistry());

export function allNpcs(): readonly NpcDef[] {
  return REGISTRY;
}

export function npcsForFloor(depth: number): NpcDef[] {
  return REGISTRY.filter(
    (n) => !n.boss && depth >= n.min_floor && depth <= n.max_floor,
  );
}

export function bossesForFloor(depth: number): NpcDef[] {
  return REGISTRY.filter(
    (n) => n.boss === true && depth >= n.min_floor && depth <= n.max_floor,
  );
}

export function npcById(id: string): NpcDef | undefined {
  return REGISTRY.find((n) => n.id === id);
}
