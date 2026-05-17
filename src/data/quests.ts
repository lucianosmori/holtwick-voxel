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
  // P8.7 — deliver-bread. Edda's second quest after find_aldric completes.
  // Reuses `deliver` trigger which consumes 1 bread from the player on dialog
  // open with Petra (the baker). Reward 15 gold.
  {
    id: "edda_deliver_bread",
    giver_npc_id: "edda",
    title: "Bread for the Baker",
    description:
      "Edda asks you to run a fresh loaf to Petra at the market stall — the morning bake came up one short. Bring her one bread.",
    trigger: { type: "deliver", item_id: "bread", npc_id: "petra" },
    reward: { gold: 15 },
  },
  // P8.7 — find-the-spring. Hilda's second quest after well_visit completes.
  // walk_to trigger: standing within radius=2 of cell (8, 60) — the quiet
  // SW village edge, well outside roads/plaza/pond — completes the quest.
  // Reward 30 gold.
  {
    id: "hilda_find_spring",
    giver_npc_id: "hilda",
    title: "Find the Hidden Spring",
    description:
      "Hilda says the old spring at the village's southwest edge still runs clear if you can find it. Walk to the far corner past the pond.",
    trigger: { type: "walk_to", cell: { x: 8, z: 60 }, radius: 2 },
    reward: { gold: 30 },
  },
  // P8.7 — talk-to-all. Plan called for "Bren" — no such NPC; Dorin (the
  // plaza-wandering miner) gets the social-butterfly quest. Trigger fires
  // when the player has opened dialog with every NPC in the 12-strong cast
  // (Dorin counts too — the act of accepting from him registers him).
  // Reward 50 gold.
  {
    id: "dorin_talk_to_all",
    giver_npc_id: "dorin",
    title: "Meet the Village",
    description:
      "Dorin reckons a stranger ought to shake every hand in town before they're called a neighbour. Talk to all twelve villagers.",
    trigger: {
      type: "talk_to_all",
      npc_ids: [
        "edda", "finn", "aldric", "mireille", "boran", "wren", "cassia",
        "karsten", "hilda", "petra", "ronan", "dorin",
      ],
    },
    reward: { gold: 50 },
  },
];

export function questById(id: string): QuestDef | undefined {
  return QUESTS.find((q) => q.id === id);
}

export function questsGivenBy(npcId: string): QuestDef[] {
  return QUESTS.filter((q) => q.giver_npc_id === npcId);
}
