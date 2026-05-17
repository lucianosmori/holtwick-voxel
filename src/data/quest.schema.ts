// Quest schema. Locked by IMPLEMENTATION_PLAN.md P6.1; trigger union expands
// in later iters (collect → P6.6, deliver/walk_to → P8.7).

export interface QuestDef {
  id: string;
  giver_npc_id: string;
  title: string;
  description: string;
  trigger: { type: "talk_to"; npc_id: string };
  reward: { gold: number };
}

export type QuestStatus = "not_started" | "in_progress" | "complete";

export interface QuestState {
  status: QuestStatus;
  accepted_at?: number;
  completed_at?: number;
}
