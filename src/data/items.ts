// Canonical item corpus for P6.3. Append entries here; world spawn picks
// from this list uniformly. Three starter items match the spec colors so
// the player can visually distinguish them at a glance.

import type { ItemDef } from "./item.schema";

export const ITEMS: ItemDef[] = [
  { id: "gold_coin",      name: "Gold Coin",      color: 0xffd84a, stack: 999 },
  { id: "health_potion",  name: "Health Potion",  color: 0xd64a4a, stack: 10,  effect: { type: "heal", amount: 25 } },
  { id: "iron_ore",       name: "Iron Ore",       color: 0x8a8a8a, stack: 50 },
  { id: "bread",          name: "Bread",          color: 0xc89a5f, stack: 20,  effect: { type: "heal", amount: 10 } },
  { id: "apple",          name: "Apple",          color: 0xe8443a, stack: 20,  effect: { type: "heal", amount: 5 } },
  { id: "wooden_sword",   name: "Wooden Sword",   color: 0x8a5a32, stack: 1 },
  { id: "wooden_shield",  name: "Wooden Shield",  color: 0x5a3b1f, stack: 1 },
];

// P8.6 — guaranteed-spawn IDs. Village placement seeds at least 3 of each so
// the new item types are visible without depending on RNG selection.
export const SEEDED_ITEM_IDS: ReadonlyArray<string> = [
  "bread",
  "apple",
  "wooden_sword",
  "wooden_shield",
];
export const SEEDED_PER_TYPE = 3;

export function itemById(id: string): ItemDef | undefined {
  return ITEMS.find((i) => i.id === id);
}
