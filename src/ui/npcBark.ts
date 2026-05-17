// P7.5 NPC idle barks. Each frame, for every NPC within 8 voxels of the
// player, pick a random `barks_idle` string every 15-30s (per-NPC random
// schedule) and float it above the NPC's head as a CSS-positioned div for
// ~4s (fade-in 200ms, hold 3500ms, fade-out 300ms). NPCs currently in
// dialog with the player are skipped. No LLM call — pure data.
//
// `?test=1` shortens the schedule to 150-400ms so the validate-visual gate
// can assert a bark appears without sitting on a 30s timer.

import * as THREE from "three";
import type { NpcDef } from "../data/npc.schema";

export const BARK_PROXIMITY_VOXELS = 8;
const PROXIMITY_SQ = BARK_PROXIMITY_VOXELS * BARK_PROXIMITY_VOXELS;
const MIN_INTERVAL_MS = 15_000;
const MAX_INTERVAL_MS = 30_000;
const TEST_MIN_INTERVAL_MS = 150;
const TEST_MAX_INTERVAL_MS = 400;
const FADE_IN_MS = 200;
const HOLD_MS = 3_500;
const FADE_OUT_MS = 300;
const TOTAL_MS = FADE_IN_MS + HOLD_MS + FADE_OUT_MS;
// World units above the NPC mesh origin where the bark anchors.
const BARK_Y_OFFSET = 1.6;

export interface BarkNpc {
  id: string;
  def: NpcDef;
  mesh: THREE.Object3D;
}

interface ActiveBark {
  el: HTMLDivElement;
  npcId: string;
  startedAt: number;
}

interface NpcBarkState {
  nextAt: number;
}

const npcState = new Map<string, NpcBarkState>();
const active: ActiveBark[] = [];
let layer: HTMLDivElement | null = null;
let testMode = false;
const projection = new THREE.Vector3();

export function setBarkTestMode(on: boolean): void {
  testMode = on;
}

function intervalMs(): number {
  const min = testMode ? TEST_MIN_INTERVAL_MS : MIN_INTERVAL_MS;
  const max = testMode ? TEST_MAX_INTERVAL_MS : MAX_INTERVAL_MS;
  return min + Math.random() * (max - min);
}

function ensureLayer(): HTMLDivElement {
  if (layer && layer.isConnected) return layer;
  const existing = document.getElementById("npc-bark-layer") as HTMLDivElement | null;
  if (existing) {
    layer = existing;
    return layer;
  }
  const el = document.createElement("div");
  el.id = "npc-bark-layer";
  document.body.appendChild(el);
  layer = el;
  return el;
}

function pickBark(def: NpcDef): string | null {
  const arr = def.barks_idle;
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function isActiveFor(npcId: string): boolean {
  for (const b of active) if (b.npcId === npcId) return true;
  return false;
}

function spawnBark(npc: BarkNpc, text: string, now: number): void {
  const layerEl = ensureLayer();
  const el = document.createElement("div");
  el.className = "npc-bark";
  el.dataset.npcId = npc.id;
  el.textContent = text;
  el.style.opacity = "0";
  layerEl.appendChild(el);
  active.push({ el, npcId: npc.id, startedAt: now });
}

export interface BarkUpdateArgs {
  npcs: BarkNpc[];
  playerPos: THREE.Vector3;
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  dialogNpcId: string | null;
  now: number;
}

export function updateNpcBarks(args: BarkUpdateArgs): void {
  const { npcs, playerPos, camera, canvas, dialogNpcId, now } = args;

  for (const npc of npcs) {
    if (npc.id === dialogNpcId) continue;
    const dx = npc.mesh.position.x - playerPos.x;
    const dz = npc.mesh.position.z - playerPos.z;
    if (dx * dx + dz * dz > PROXIMITY_SQ) continue;
    let s = npcState.get(npc.id);
    if (!s) {
      s = { nextAt: now + intervalMs() };
      npcState.set(npc.id, s);
      continue;
    }
    if (now < s.nextAt) continue;
    if (isActiveFor(npc.id)) {
      s.nextAt = now + intervalMs();
      continue;
    }
    const text = pickBark(npc.def);
    s.nextAt = now + intervalMs();
    if (!text) continue;
    spawnBark(npc, text, now);
  }

  if (active.length === 0) return;

  const rect = canvas.getBoundingClientRect();
  for (let i = active.length - 1; i >= 0; i--) {
    const b = active[i];
    const age = now - b.startedAt;
    const npc = npcs.find((n) => n.id === b.npcId);
    if (!npc || age >= TOTAL_MS) {
      b.el.remove();
      active.splice(i, 1);
      continue;
    }
    let opacity = 1;
    if (age < FADE_IN_MS) {
      opacity = age / FADE_IN_MS;
    } else if (age > FADE_IN_MS + HOLD_MS) {
      opacity = Math.max(0, 1 - (age - FADE_IN_MS - HOLD_MS) / FADE_OUT_MS);
    }
    projection.set(
      npc.mesh.position.x,
      npc.mesh.position.y + BARK_Y_OFFSET,
      npc.mesh.position.z,
    );
    projection.project(camera);
    // Hide barks projected behind the camera (z>1 after projection).
    if (projection.z > 1) {
      b.el.style.opacity = "0";
      continue;
    }
    const x = rect.left + (projection.x * 0.5 + 0.5) * rect.width;
    const y = rect.top + (-projection.y * 0.5 + 0.5) * rect.height;
    b.el.style.transform =
      `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    b.el.style.opacity = opacity.toFixed(3);
  }
}

export function forceBark(npc: BarkNpc, now: number): boolean {
  const text = pickBark(npc.def);
  if (!text) return false;
  spawnBark(npc, text, now);
  npcState.set(npc.id, { nextAt: now + intervalMs() });
  return true;
}

export function activeBarkCount(): number {
  return active.length;
}
