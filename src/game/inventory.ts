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

const counts = new Map<string, number>();
const listeners = new Set<Listener>();

export function subscribeInventory(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
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
