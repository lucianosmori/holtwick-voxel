export interface NpcDef {
  id: string;
  name: string;
  role: string;
  sprite_key: string;
  hp: number;
  dmg: number;
  barks_idle: string[];
  barks_combat: string[];
  chat: boolean;
  boss?: boolean;
  min_floor: number;
  max_floor: number;
}

const ID_RE = /^[a-z0-9_-]+$/;

function fail(source: string, msg: string): never {
  throw new Error(`invalid NPC ${source}: ${msg}`);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function isFiniteInt(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

export function parseNpcDef(source: string, raw: unknown): NpcDef {
  if (raw === null || typeof raw !== "object") {
    fail(source, "expected object at root");
  }
  const o = raw as Record<string, unknown>;

  if (typeof o.id !== "string" || !ID_RE.test(o.id)) {
    fail(source, "id must be a non-empty [a-z0-9_-] string");
  }
  if (typeof o.name !== "string" || o.name.length === 0) fail(source, "name must be a non-empty string");
  if (typeof o.role !== "string" || o.role.length === 0) fail(source, "role must be a non-empty string");
  if (typeof o.sprite_key !== "string" || o.sprite_key.length === 0) {
    fail(source, "sprite_key must be a non-empty string");
  }
  if (!isFiniteInt(o.hp) || o.hp <= 0) fail(source, "hp must be a positive integer");
  if (!isFiniteInt(o.dmg) || o.dmg < 0) fail(source, "dmg must be a non-negative integer");
  if (!isStringArray(o.barks_idle)) fail(source, "barks_idle must be string[]");
  if (!isStringArray(o.barks_combat)) fail(source, "barks_combat must be string[]");
  if (typeof o.chat !== "boolean") fail(source, "chat must be a boolean");
  if (o.boss !== undefined && typeof o.boss !== "boolean") fail(source, "boss, if present, must be a boolean");
  if (!isFiniteInt(o.min_floor) || o.min_floor < 1) fail(source, "min_floor must be an integer >= 1");
  if (!isFiniteInt(o.max_floor) || o.max_floor < o.min_floor) {
    fail(source, "max_floor must be an integer >= min_floor");
  }

  const def: NpcDef = {
    id: o.id,
    name: o.name,
    role: o.role,
    sprite_key: o.sprite_key,
    hp: o.hp,
    dmg: o.dmg,
    barks_idle: o.barks_idle,
    barks_combat: o.barks_combat,
    chat: o.chat,
    min_floor: o.min_floor,
    max_floor: o.max_floor,
  };
  if (o.boss === true) def.boss = true;
  return def;
}
