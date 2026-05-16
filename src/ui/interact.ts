// Player <-> NPC proximity tracking + interact-trigger plumbing.
// `update(player, npcs)` runs each frame: picks the closest in-range NPC,
// toggles the hint + interact button visibility, and remembers the
// active target for the next interact-trigger.

import type * as THREE from "three";

export const INTERACT_RANGE = 3; // voxels (world units)

export interface InteractableNpc {
  id: string;
  name: string;
  mesh: THREE.Object3D;
}

export type InteractHandler = (npc: InteractableNpc) => void;

let nearest: InteractableNpc | null = null;
let bound = false;

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

export function bindInteract(handler: InteractHandler): void {
  if (bound) return;
  bound = true;

  $("interact-btn")?.addEventListener("click", () => {
    if (nearest) handler(nearest);
  });

  window.addEventListener("keydown", (e) => {
    if (e.code !== "KeyE" || !nearest || e.repeat) return;
    // Don't hijack "e" when the player is typing into the chat input or
    // any other editable element — that was the "hllo" typing bug.
    const target = e.target as HTMLElement | null;
    if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;
    if (document.getElementById("dialog-backdrop")?.classList.contains("show")) return;
    e.preventDefault();
    handler(nearest);
  });
}

export function updateInteract(player: THREE.Object3D, npcs: InteractableNpc[]): void {
  let closest: InteractableNpc | null = null;
  let closestDist = INTERACT_RANGE;
  for (const npc of npcs) {
    const d = player.position.distanceTo(npc.mesh.position);
    if (d < closestDist) {
      closestDist = d;
      closest = npc;
    }
  }
  if (closest !== nearest) {
    nearest = closest;
    const hint = $("hint");
    const btn = $("interact-btn");
    if (nearest) {
      if (hint) {
        hint.textContent = `Press E to talk to ${nearest.name}`;
        hint.classList.add("show");
      }
      btn?.removeAttribute("disabled");
      if (btn) btn.style.opacity = "1";
    } else {
      hint?.classList.remove("show");
      btn?.setAttribute("disabled", "true");
      if (btn) btn.style.opacity = "0.4";
    }
  }
}

export function getNearestNpc(): InteractableNpc | null {
  return nearest;
}
