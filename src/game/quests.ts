// Quest state machine + gold purse. In-memory only for P6.1; localStorage
// persistence lands with P6.5. Subscribers are notified after every state
// transition so the HUD (P6.2) can re-render without polling.

import type { QuestDef, QuestState } from "../data/quest.schema";
import { QUESTS, questById } from "../data/quests";

type Listener = () => void;

const states = new Map<string, QuestState>();
let gold = 0;
const listeners = new Set<Listener>();

for (const q of QUESTS) {
  states.set(q.id, { status: "not_started" });
}

function emit(): void {
  for (const l of listeners) l();
}

export function subscribeQuests(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function getQuestState(id: string): QuestState | undefined {
  const s = states.get(id);
  return s ? { ...s } : undefined;
}

export function getQuests(): Array<{ def: QuestDef; state: QuestState }> {
  return QUESTS.map((def) => ({
    def,
    state: { ...(states.get(def.id) ?? { status: "not_started" }) },
  }));
}

export function getGold(): number {
  return gold;
}

export function acceptQuest(id: string): boolean {
  const def = questById(id);
  const state = states.get(id);
  if (!def || !state || state.status !== "not_started") return false;
  state.status = "in_progress";
  state.accepted_at = Date.now();
  emit();
  return true;
}

export function completeQuest(id: string): boolean {
  const def = questById(id);
  const state = states.get(id);
  if (!def || !state || state.status !== "in_progress") return false;
  state.status = "complete";
  state.completed_at = Date.now();
  gold += def.reward.gold;
  emit();
  return true;
}

// Called when the player opens dialog with `npcId`. Auto-completes any
// in_progress `talk_to` quest whose target is this NPC. Returns the IDs of
// quests that just completed so the dialog can render confirmation lines.
// Replace the in-memory quest map + gold purse from a snapshot (load-on-boot).
// Quests missing from the snapshot reset to `not_started`. Emits once so the
// HUD re-renders against the restored state.
export function restoreQuestsState(
  snapshot: Record<string, QuestState>,
  goldVal: number,
): void {
  for (const q of QUESTS) {
    const s = snapshot[q.id];
    if (s && (s.status === "not_started" || s.status === "in_progress" || s.status === "complete")) {
      states.set(q.id, {
        status: s.status,
        accepted_at: s.accepted_at,
        completed_at: s.completed_at,
      });
    } else {
      states.set(q.id, { status: "not_started" });
    }
  }
  gold = Number.isFinite(goldVal) ? Math.max(0, Math.floor(goldVal)) : 0;
  emit();
}

export function onTalkTo(npcId: string): string[] {
  const completed: string[] = [];
  for (const def of QUESTS) {
    const state = states.get(def.id);
    if (!state || state.status !== "in_progress") continue;
    if (def.trigger.type === "talk_to" && def.trigger.npc_id === npcId) {
      if (completeQuest(def.id)) completed.push(def.id);
    }
  }
  return completed;
}
