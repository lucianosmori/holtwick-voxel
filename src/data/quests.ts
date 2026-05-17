// Canonical quest list. Append new entries here; the state machine in
// `src/game/quests.ts` discovers them automatically.

import type { QuestDef } from "./quest.schema";

export const QUESTS: QuestDef[] = [
  {
    id: "edda_find_aldric",
    giver_npc_id: "edda",
    title: "Find Aldric",
    description:
      "Edda says Aldric of the Watch stands post on the plaza. Go say hello on her behalf.",
    trigger: { type: "talk_to", npc_id: "aldric" },
    reward: { gold: 10 },
  },
  {
    id: "finn_iron_ore",
    giver_npc_id: "finn",
    title: "Iron for the Forge",
    description:
      "Finn runs errands for Boran between sets — three iron ore should keep the anvil ringing.",
    trigger: { type: "collect", item_id: "iron_ore", count: 3 },
    reward: { gold: 25 },
  },
  {
    id: "well_visit",
    giver_npc_id: "hilda",
    title: "Visit the Well",
    description:
      "Hilda asks you to stop by the well and pay your respects to the water. Come back when you've taken a look.",
    trigger: { type: "talk_to", npc_id: "hilda" },
    reward: { gold: 5 },
  },
  {
    // Plan called for "Bren the bard" but no NPC by that name exists in the
    // tavern cast; Finn IS the bard, so he gets the second quest. Demonstrates
    // item rewards (health_potion lands in inventory, no gold awarded).
    id: "bren_5_coins",
    giver_npc_id: "finn",
    title: "Coins for a Song",
    description:
      "Finn says five gold coins jingling in his cap inspire a brand-new ballad. Drop them in and he'll trade you a vial of Mireille's healing tonic.",
    trigger: { type: "collect", item_id: "gold_coin", count: 5 },
    reward: { items: [{ item_id: "health_potion", count: 1 }] },
  },
];

export function questById(id: string): QuestDef | undefined {
  return QUESTS.find((q) => q.id === id);
}

export function questsGivenBy(npcId: string): QuestDef[] {
  return QUESTS.filter((q) => q.giver_npc_id === npcId);
}
