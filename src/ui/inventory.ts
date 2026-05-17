// Inventory modal (P6.4). `I` toggles open/close; Escape closes; typing into
// chat input keeps `i` going into the input instead of hijacking it. Slots
// re-render live as items come in via subscribeInventory().

import { getInventory, subscribeInventory } from "../game/inventory";
import { itemById } from "../data/items";

const SLOT_COUNT = 12;
let bound = false;

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`inventory: missing #${id}`);
  return el;
}

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

function isDialogOpen(): boolean {
  return !!document.getElementById("dialog-backdrop")?.classList.contains("show");
}

export function bindInventory(): void {
  if (bound) return;
  bound = true;

  const grid = $("inventory-grid");
  grid.innerHTML = "";
  for (let i = 0; i < SLOT_COUNT; i++) {
    const slot = document.createElement("div");
    slot.className = "inv-slot inv-slot-empty";
    slot.dataset.slot = String(i);
    grid.appendChild(slot);
  }

  $("inventory-close").addEventListener("click", () => closeInventory());
  $("inventory-backdrop").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeInventory();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isInventoryOpen()) {
      e.preventDefault();
      closeInventory();
      return;
    }
    if (e.code !== "KeyI" || e.repeat) return;
    if (isEditableTarget(e.target)) return;
    if (isDialogOpen()) return;
    e.preventDefault();
    if (isInventoryOpen()) closeInventory();
    else openInventory();
  });

  subscribeInventory(() => {
    if (isInventoryOpen()) render();
  });
}

export function openInventory(): void {
  render();
  $("inventory-backdrop").classList.add("show");
}

export function closeInventory(): void {
  $("inventory-backdrop").classList.remove("show");
}

export function isInventoryOpen(): boolean {
  return $("inventory-backdrop").classList.contains("show");
}

function render(): void {
  const stacks = getInventory();
  const slots = $("inventory-grid").children;
  for (let i = 0; i < SLOT_COUNT; i++) {
    const slot = slots[i] as HTMLDivElement | undefined;
    if (!slot) continue;
    const stack = stacks[i];
    const def = stack ? itemById(stack.item_id) : undefined;
    if (!stack || !def) {
      slot.className = "inv-slot inv-slot-empty";
      slot.replaceChildren();
      continue;
    }
    slot.className = "inv-slot";
    slot.replaceChildren(
      makeColorSquare(def.color),
      makeNameLabel(def.name),
      makeCountBadge(stack.count),
    );
  }
}

function makeColorSquare(color: number): HTMLDivElement {
  const sq = document.createElement("div");
  sq.className = "inv-slot-color";
  sq.style.background = "#" + color.toString(16).padStart(6, "0");
  return sq;
}

function makeNameLabel(name: string): HTMLDivElement {
  const lbl = document.createElement("div");
  lbl.className = "inv-slot-name";
  lbl.textContent = name;
  return lbl;
}

function makeCountBadge(count: number): HTMLDivElement {
  const badge = document.createElement("div");
  badge.className = "inv-slot-count";
  badge.textContent = String(count);
  return badge;
}
