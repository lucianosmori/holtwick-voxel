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

export function setFpsOverlayText(text: string): void {
  const el = document.getElementById("fps-overlay");
  if (el) el.textContent = text;
}

export function setFpsOverlayVisible(visible: boolean): void {
  const el = document.getElementById("fps-overlay");
  if (!el) return;
  el.classList.toggle("show", visible);
}

export function isFpsOverlayVisible(): boolean {
  const el = document.getElementById("fps-overlay");
  return !!el && el.classList.contains("show");
}

// P8.3 time-of-day HUD label (under minimap). Maps the DayNight cycle phase
// to one of 4 buckets — bucket boundaries are the spec, not the actual solar
// elevation (the cycle starts at noon, not midnight). Caller is responsible
// for throttling; main.ts ticks every 30 frames.
const TIME_LABELS = ["Morning", "Noon", "Dusk", "Night"] as const;

export function setTimeOfDayLabel(phase: number): void {
  const el = document.getElementById("hud-time");
  if (!el) return;
  if (!Number.isFinite(phase)) return;
  const wrapped = ((phase % 1) + 1) % 1;
  const bucket = Math.min(3, Math.max(0, Math.floor(wrapped * 4)));
  const label = TIME_LABELS[bucket];
  if (el.textContent !== label) el.textContent = label;
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
