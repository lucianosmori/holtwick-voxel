// Inventory state. In-memory only for P6.3; localStorage persistence lands
// with P6.5. Mirrors the quest store's subscribe/emit pattern so the HUD +
// inventory modal (P6.4) can re-render without polling.

import { itemById } from "../data/items";

export interface InventoryStack {
  item_id: string;
  count: number;
}

export interface PickupEvent {
  item_id: string;
  /** Actual delta applied — clamped by per-item stack cap. */
  delta: number;
  /** Resulting total in inventory after the pickup. */
  total: number;
}

type Listener = (e: PickupEvent) => void;
type PickedListener = () => void;

const counts = new Map<string, number>();
const listeners = new Set<Listener>();
const pickedIndices = new Set<number>();
const pickedListeners = new Set<PickedListener>();

export function subscribeInventory(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

// P6.5.1 — picked world-item indices are persisted alongside inventory counts
// so a reload doesn't respawn an item that was already picked up (the
// deterministic `computeItemSpawns(seed, ...)` produces the same ordering on
// every boot, so the index is the stable handle).
export function subscribePicked(l: PickedListener): () => void {
  pickedListeners.add(l);
  return () => {
    pickedListeners.delete(l);
  };
}

export function markPicked(index: number): void {
  if (!Number.isInteger(index) || index < 0) return;
  if (pickedIndices.has(index)) return;
  pickedIndices.add(index);
  for (const l of pickedListeners) l();
}

export function getPickedIndices(): number[] {
  return Array.from(pickedIndices).sort((a, b) => a - b);
}

export function isPicked(index: number): boolean {
  return pickedIndices.has(index);
}

export function restorePickedIndices(arr: number[]): void {
  pickedIndices.clear();
  for (const i of arr ?? []) {
    if (Number.isInteger(i) && i >= 0) pickedIndices.add(i);
  }
}

export function resetPickedIndices(): void {
  pickedIndices.clear();
}

export function getInventory(): InventoryStack[] {
  return Array.from(counts.entries())
    .filter(([, c]) => c > 0)
    .map(([item_id, count]) => ({ item_id, count }));
}

export function getItemCount(id: string): number {
  return counts.get(id) ?? 0;
}

export function addItem(id: string, count: number = 1): PickupEvent | null {
  const def = itemById(id);
  if (!def || count <= 0) return null;
  const prev = counts.get(id) ?? 0;
  const next = Math.min(prev + count, def.stack);
  counts.set(id, next);
  const event: PickupEvent = { item_id: id, delta: next - prev, total: next };
  for (const l of listeners) l(event);
  return event;
}

// P8.7 — decrement a stack (deliver quests consume the delivered item). Returns
// true on success, false when the player doesn't have enough. Emits a pickup
// event with negative delta so subscribers (HUD, inventory modal, auto-save)
// re-render and persist.
export function consumeItem(id: string, count: number = 1): boolean {
  const def = itemById(id);
  if (!def || count <= 0) return false;
  const prev = counts.get(id) ?? 0;
  if (prev < count) return false;
  const next = prev - count;
  if (next === 0) counts.delete(id);
  else counts.set(id, next);
  const event: PickupEvent = { item_id: id, delta: -count, total: next };
  for (const l of listeners) l(event);
  return true;
}

export function resetInventory(): void {
  counts.clear();
}

// Replace the inventory from a snapshot (load-on-boot). Unknown item ids and
// counts beyond the per-item stack cap are discarded. Emits a `delta=0` pickup
// event per restored stack so any open inventory UI re-renders.
export function restoreInventory(stacks: InventoryStack[]): void {
  counts.clear();
  for (const s of stacks ?? []) {
    if (!s || typeof s.item_id !== "string" || !Number.isFinite(s.count)) continue;
    const def = itemById(s.item_id);
    if (!def) continue;
    const n = Math.max(0, Math.min(Math.floor(s.count), def.stack));
    if (n > 0) counts.set(s.item_id, n);
  }
  for (const [item_id, total] of counts) {
    for (const l of listeners) l({ item_id, delta: 0, total });
  }
}
