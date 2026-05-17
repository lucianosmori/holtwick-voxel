// Quest schema. Locked by IMPLEMENTATION_PLAN.md P6.1; trigger union expanded
// at P6.6 to add `collect` (deliver/walk_to land with P8.7). Reward shape
// loosened at P7.7 so item rewards can ship without breaking the existing
// gold-only entries (both fields optional, at least one expected per quest).

export type QuestTrigger =
  | { type: "talk_to"; npc_id: string }
  | { type: "collect"; item_id: string; count: number };

export interface QuestItemReward {
  item_id: string;
  count: number;
}

export interface QuestDef {
  id: string;
  giver_npc_id: string;
  title: string;
  description: string;
  trigger: QuestTrigger;
  reward: { gold?: number; items?: QuestItemReward[] };
}

export type QuestStatus = "not_started" | "in_progress" | "complete";

export interface QuestState {
  status: QuestStatus;
  accepted_at?: number;
  completed_at?: number;
}
