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
];

export function questById(id: string): QuestDef | undefined {
  return QUESTS.find((q) => q.id === id);
}

export function questsGivenBy(npcId: string): QuestDef[] {
  return QUESTS.filter((q) => q.giver_npc_id === npcId);
}
