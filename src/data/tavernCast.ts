// Tavern-side NPC definitions, layered on top of the dungeon NPC corpus
// lifted verbatim from `02-fp-overnight-roguelike` (those are mobs; the
// Holtwick tavern needs friendly NPCs the player can chat with).
//
// These follow the same `NpcDef` schema so `chat/webllm.ts` can build a
// system prompt without special-casing.

import type { NpcDef } from "./npc.schema";

export const EDDA: NpcDef = {
  id: "edda",
  name: "Edda the Innkeeper",
  role: "innkeeper of the Holtwick tavern",
  sprite_key: "edda",
  hp: 999,
  dmg: 0,
  barks_idle: [
    "Welcome to the Holtwick tavern, traveler.",
    "Stew's hot and the ale's cold — what'll it be?",
    "The hearth never sleeps in my house.",
    "Mind your boots, those planks are freshly cut.",
    "Lost, are you? Plaza's south, road's east.",
    "Drink up. The night is long in these hills.",
  ],
  barks_combat: [
    "Out of my tavern, scoundrel!",
    "I'll fetch the broom — and the iron beneath it.",
  ],
  chat: true,
  min_floor: 1,
  max_floor: 99,
};
