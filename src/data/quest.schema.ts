// Quest schema. Locked by IMPLEMENTATION_PLAN.md P6.1; trigger union expanded
// at P6.6 to add `collect`; at P8.7 to add `deliver`, `walk_to`, and
// `talk_to_all`. Reward shape loosened at P7.7 so item rewards can ship
// without breaking the existing gold-only entries (both fields optional, at
// least one expected per quest).

export type QuestTrigger =
  | { type: "talk_to"; npc_id: string }
  | { type: "collect"; item_id: string; count: number }
  | { type: "deliver"; item_id: string; npc_id: string }
  | { type: "walk_to"; cell: { x: number; z: number }; radius: number }
  | { type: "talk_to_all"; npc_ids: string[] };

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
