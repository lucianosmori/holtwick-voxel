// Always-visible HUD: gold purse + quest log. Subscribes to the quest store
// so gold + quest state changes re-render the DOM without polling. Inventory
// row is added by P6.3 once the inventory state lands.

import { getGold, getQuests, subscribeQuests } from "../game/quests";
import type { QuestStatus } from "../data/quest.schema";

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`hud: missing #${id}`);
  return el;
}

const STATUS_PREFIX: Record<QuestStatus, string> = {
  not_started: "[new]",
  in_progress: "[active]",
  complete: "[done]",
};

export function mountHud(): void {
  render();
  subscribeQuests(render);
}

function render(): void {
  const gold = getGold();
  const all = getQuests();
  // Hide quests the player has never accepted — keeps the log focused on
  // active + completed work, matching the spec layout.
  const visible = all.filter((q) => q.state.status !== "not_started");

  $("hud-gold").textContent = `Gold: ${gold}`;
  $("hud-quest-count").textContent = `Quests (${visible.length})`;

  const list = $("hud-quest-list");
  list.innerHTML = "";
  for (const { def, state } of visible) {
    const row = document.createElement("div");
    row.className = `hud-quest hud-quest-${state.status}`;
    row.textContent = `${STATUS_PREFIX[state.status]} ${def.title}`;
    list.appendChild(row);
  }
}
