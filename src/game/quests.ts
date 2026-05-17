// Quest state machine + gold purse. In-memory only for P6.1; localStorage
// persistence lands with P6.5. Subscribers are notified after every state
// transition so the HUD (P6.2) can re-render without polling.

import type { QuestDef, QuestState } from "../data/quest.schema";
import { QUESTS, questById } from "../data/quests";
import { getItemCount, subscribeInventory } from "./inventory";

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
  // P6.6 — collect quests can be accepted when the player already holds
  // enough items (e.g. picked them up before talking to the giver). Complete
  // immediately so the accept-then-already-done case doesn't get wedged.
  if (
    def.trigger.type === "collect" &&
    getItemCount(def.trigger.item_id) >= def.trigger.count
  ) {
    completeQuest(id);
  }
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
      continue;
    }
    // P6.6 — collect quests also "deliver" on dialog open with the giver as a
    // defensive fallback in case the inventory-subscription path missed (e.g.
    // a quest accepted AFTER the items were already in inventory).
    if (
      def.trigger.type === "collect" &&
      def.giver_npc_id === npcId &&
      getItemCount(def.trigger.item_id) >= def.trigger.count
    ) {
      if (completeQuest(def.id)) completed.push(def.id);
    }
  }
  return completed;
}

// P6.6 — subscribe to inventory transitions so collect quests auto-complete
// the moment the player's count crosses the threshold (no need to return to
// the giver if you already have an in-progress collect quest). Idempotent.
let collectBound = false;
export function bindCollectAutoComplete(): void {
  if (collectBound) return;
  collectBound = true;
  subscribeInventory((evt) => {
    for (const def of QUESTS) {
      if (def.trigger.type !== "collect") continue;
      if (def.trigger.item_id !== evt.item_id) continue;
      const state = states.get(def.id);
      if (!state || state.status !== "in_progress") continue;
      if (evt.total >= def.trigger.count) {
        completeQuest(def.id);
      }
    }
  });
}
