// Canonical item corpus for P6.3. Append entries here; world spawn picks
// from this list uniformly. Three starter items match the spec colors so
// the player can visually distinguish them at a glance.

import type { ItemDef } from "./item.schema";

export const ITEMS: ItemDef[] = [
  { id: "gold_coin",     name: "Gold Coin",     color: 0xffd84a, stack: 999 },
  { id: "health_potion", name: "Health Potion", color: 0xd64a4a, stack: 10, effect: { type: "heal", amount: 25 } },
  { id: "iron_ore",      name: "Iron Ore",      color: 0x8a8a8a, stack: 50 },
];

export function itemById(id: string): ItemDef | undefined {
  return ITEMS.find((i) => i.id === id);
}
