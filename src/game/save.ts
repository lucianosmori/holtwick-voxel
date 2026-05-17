// Persist a coarse snapshot of player + world state to localStorage so a
// reload resumes the run. Auto-save fires on every quest/inventory
// transition + on dialog close, debounced 500ms to coalesce bursts, plus
// a 30s heartbeat tick. Versioned ({version: 1}); on mismatch we wipe and
// boot fresh rather than try to migrate.

import type { QuestState } from "../data/quest.schema";
import {
  getGold,
  getQuests,
  restoreQuestsState,
  subscribeQuests,
} from "./quests";
import {
  getInventory,
  getPickedIndices,
  restoreInventory,
  restorePickedIndices,
  subscribeInventory,
  subscribePicked,
  type InventoryStack,
} from "./inventory";

export const SAVE_KEY = "holtwick-voxel:save:v1";
const DEBOUNCE_MS = 500;
const INTERVAL_MS = 30_000;
const SAVE_VERSION = 1;

export interface SaveV1 {
  version: 1;
  player: { x: number; z: number };
  dayNight: number;
  quests: Record<string, QuestState>;
  inventory: InventoryStack[];
  gold: number;
  // P6.5.1 — additive field; older saves without it default to [] in
  // applySave so they keep loading, then resave with the field populated.
  picked_item_indices: number[];
  saved_at: number;
}

export interface SaveSource {
  getPlayerXZ: () => { x: number; z: number };
  getDayNightPhase: () => number;
}

export interface SaveTarget {
  setPlayerXZ: (x: number, z: number) => void;
  setDayNightPhase: (phase: number) => void;
}

let source: SaveSource | null = null;
let debounceTimer: number | null = null;
let interval: number | null = null;
let unsubQuests: (() => void) | null = null;
let unsubInv: (() => void) | null = null;
let unsubPicked: (() => void) | null = null;

export function loadSave(): SaveV1 | null {
  if (typeof localStorage === "undefined") return null;
  let raw: string | null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SaveV1>;
    if (parsed.version !== SAVE_VERSION) {
      localStorage.removeItem(SAVE_KEY);
      return null;
    }
    return parsed as SaveV1;
  } catch {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {}
    return null;
  }
}

export function applySave(save: SaveV1, target: SaveTarget): void {
  if (save.player && Number.isFinite(save.player.x) && Number.isFinite(save.player.z)) {
    target.setPlayerXZ(save.player.x, save.player.z);
  }
  if (Number.isFinite(save.dayNight)) {
    target.setDayNightPhase(save.dayNight);
  }
  const questsRecord: Record<string, QuestState> = {};
  for (const [id, state] of Object.entries(save.quests ?? {})) {
    if (state && typeof (state as QuestState).status === "string") {
      questsRecord[id] = state as QuestState;
    }
  }
  restoreQuestsState(questsRecord, save.gold ?? 0);
  restoreInventory(save.inventory ?? []);
  // P6.5.1 — must run BEFORE main.ts spawns world items so the spawn loop
  // can skip the picked slots. main.ts already calls applySave between
  // player ctor and world-item spawn, so the ordering already holds.
  restorePickedIndices(save.picked_item_indices ?? []);
}

function buildSnapshot(): SaveV1 {
  if (!source) throw new Error("save: no source bound");
  const { x, z } = source.getPlayerXZ();
  const quests: Record<string, QuestState> = {};
  for (const { def, state } of getQuests()) quests[def.id] = state;
  return {
    version: SAVE_VERSION,
    player: { x, z },
    dayNight: source.getDayNightPhase(),
    quests,
    inventory: getInventory(),
    gold: getGold(),
    picked_item_indices: getPickedIndices(),
    saved_at: Date.now(),
  };
}

function writeNow(): void {
  if (!source) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(buildSnapshot()));
  } catch (err) {
    console.warn("[save] write failed:", err);
  }
}

export function scheduleSave(): void {
  if (!source) return;
  if (debounceTimer !== null) window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    debounceTimer = null;
    writeNow();
  }, DEBOUNCE_MS);
}

export function flushSave(): void {
  if (debounceTimer !== null) {
    window.clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  writeNow();
}

export function bindAutoSave(src: SaveSource): void {
  source = src;
  unsubQuests?.();
  unsubInv?.();
  unsubPicked?.();
  unsubQuests = subscribeQuests(scheduleSave);
  unsubInv = subscribeInventory(scheduleSave);
  // Defensive: pickup callback in main.ts already calls addItem (which fires
  // an inventory event), but subscribe to picks directly so a future
  // pickup-without-addItem path can't slip past the save.
  unsubPicked = subscribePicked(scheduleSave);
  if (interval !== null) window.clearInterval(interval);
  interval = window.setInterval(writeNow, INTERVAL_MS);
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {}
}
