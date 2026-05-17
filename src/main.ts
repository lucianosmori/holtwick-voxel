import * as THREE from "three";
import { bootstrapScene, CAMERA_OFFSET } from "./render/scene";
import { buildVillage, computeItemSpawns, VILLAGE_DEPTH, VILLAGE_WIDTH, type ItemSpawn } from "./world/village";
import { buildVoxelMesh } from "./render/voxelMesh";
import { buildFoliageMesh, computeFoliage } from "./world/foliage";
import { Player, PLAYER_HALF } from "./entities/player";
import { BillboardNpc, NPC_Y } from "./entities/npc";
import { NpcWalker } from "./entities/npcWalker";
import { setupJoystick } from "./input/joystick";
import { bindInteract, updateInteract, type InteractableNpc } from "./ui/interact";
import { bindDialog, openDialog, closeDialog } from "./ui/dialog";
import { bindInventory, openInventory, closeInventory, isInventoryOpen } from "./ui/inventory";
import { NPC_SPAWNS } from "./data/npcSpawns";
import type { NpcDef } from "./data/npc.schema";
import { DayNight } from "./world/dayNight";
import { bindTitle } from "./ui/title";
import { isFpsOverlayVisible, mountHud, setFpsOverlayText, setFpsOverlayVisible } from "./ui/hud";
import { acceptQuest, bindCollectAutoComplete, getGold, getQuestState, getQuests } from "./game/quests";
import { itemById } from "./data/items";
import { addItem, getInventory, getItemCount, isPicked, markPicked, type InventoryStack } from "./game/inventory";
import { ITEM_BASE_Y, PICKUP_RADIUS, WorldItem } from "./entities/worldItem";
import {
  applySave,
  bindAutoSave,
  clearSave,
  flushSave,
  loadSave,
  scheduleSave,
} from "./game/save";
import {
  getMasterVolume,
  setMasterVolume,
  startAmbient,
  updateAmbient,
} from "./audio/ambient";
import { maybeStep, resetFootstepCursor } from "./audio/footsteps";
import { buildLanterns, updateLanterns } from "./render/lanterns";
import { mountMinimap } from "./ui/minimap";
import { bindSettings } from "./ui/settings";

bindTitle();
mountHud();

const { scene, camera, renderer, sun, hemi } = bootstrapScene("#game");
const dayNight = new DayNight(sun, hemi);

const VILLAGE_SEED = 1337;
const world = buildVillage(VILLAGE_SEED);
const worldMesh = buildVoxelMesh(world);
const gridOffset = new THREE.Vector3(-VILLAGE_WIDTH / 2, 0, -VILLAGE_DEPTH / 2);
worldMesh.position.copy(gridOffset);
scene.add(worldMesh);

const player = new Player(world, gridOffset);
player.attachKeyboard();
scene.add(player.mesh);

// P6.5 load-on-boot: restore player XZ + dayNight phase + quests + inventory
// + gold from localStorage before the first frame renders. HUD already
// subscribed via mountHud() above so the quest restore re-renders it
// immediately.
const restored = loadSave();
if (restored) {
  applySave(restored, {
    setPlayerXZ: (x, z) => {
      player.mesh.position.x = x;
      player.mesh.position.z = z;
    },
    setDayNightPhase: (p) => dayNight.setPhase(p),
  });
}

interface InteractableTavernNpc extends InteractableNpc {
  def: NpcDef;
}

const walkers: NpcWalker[] = [];
const interactables: InteractableTavernNpc[] = NPC_SPAWNS.map((spawn) => {
  const billboard = new BillboardNpc({
    label: spawn.def.name.split(" ")[0], // short label — first word, e.g. "Edda"
    position: new THREE.Vector3(
      gridOffset.x + spawn.cellX + 0.5,
      NPC_Y,
      gridOffset.z + spawn.cellZ + 0.5,
    ),
    background: spawn.background,
    foreground: spawn.foreground,
  });
  scene.add(billboard.mesh);
  if (spawn.path && spawn.path.length >= 2) {
    walkers.push(new NpcWalker(billboard.mesh, spawn.path, gridOffset));
  }
  return {
    id: spawn.def.id,
    name: spawn.def.name,
    mesh: billboard.mesh,
    def: spawn.def,
  };
});

// Keep references so we can re-face each NPC at the camera each frame.
const billboards = interactables.map((n) => n.mesh);

// World-item pickups (P6.3). Deterministic spawn from village seed; mesh
// removed from scene on pickup. NPC cells passed in so spawns dodge them.
const ITEM_SPAWN_SEED = VILLAGE_SEED;
const itemSpawns: ItemSpawn[] = computeItemSpawns(
  ITEM_SPAWN_SEED,
  world,
  NPC_SPAWNS.map((s) => ({ cellX: s.cellX, cellZ: s.cellZ })),
);
// P6.5.1 — parallel array with the same indexing as `itemSpawns`. Picked
// slots stay null both at load (restored picked indices) and after pickup,
// so a reload sees `picked_item_indices` in the save and skips re-spawning
// those exact slots instead of re-creating an item under the restored
// player position and immediately re-collecting it.
const worldItems: (WorldItem | null)[] = [];
for (let i = 0; i < itemSpawns.length; i++) {
  const spawn = itemSpawns[i];
  const def = itemById(spawn.item_id);
  if (!def || isPicked(i)) {
    worldItems.push(null);
    continue;
  }
  const pos = new THREE.Vector3(
    gridOffset.x + spawn.cellX + 0.5,
    ITEM_BASE_Y,
    gridOffset.z + spawn.cellZ + 0.5,
  );
  const item = new WorldItem(def, pos);
  worldItems.push(item);
  scene.add(item.mesh);
}

// P6.9 foliage: deterministic on (villageSeed + 7331) so trees don't shift
// when item or NPC layouts change. Placement dodges roads, plaza, NPC spawns,
// and item spawns so the playable village stays uncluttered. Foliage mesh
// uses the same gridOffset as the voxel mesh so tree cells align with floor
// cells one-to-one.
const FOLIAGE_SEED = (VILLAGE_SEED + 7331) >>> 0;
const trees = computeFoliage(
  FOLIAGE_SEED,
  world,
  NPC_SPAWNS.map((s) => ({ cellX: s.cellX, cellZ: s.cellZ })),
  itemSpawns.map((s) => ({ cellX: s.cellX, cellZ: s.cellZ })),
);
const foliageMesh = buildFoliageMesh(trees);
foliageMesh.position.copy(gridOffset);
scene.add(foliageMesh);

// P6.10 lantern night lighting. Four warm PointLights — tavern doorway plus
// three plaza corners — ramp from 0 by day to ~1.5 by midnight, driven by
// dayNight.currentPhase in the RAF loop below.
const lanterns = buildLanterns(gridOffset);
for (const l of lanterns) scene.add(l.light);
updateLanterns(lanterns, dayNight.currentPhase);

// P7.3 minimap — initialised after gridOffset so world→cell conversion uses
// the same anchor the voxel mesh + lanterns do. Re-rendered every 10 frames
// from the RAF loop below; the static layer (bg + roads + plaza + tavern
// outline) is pre-rendered once inside mountMinimap.
const minimap = mountMinimap({ x: gridOffset.x, z: gridOffset.z });

const PICKUP_DIST_SQ = (PICKUP_RADIUS + PLAYER_HALF) * (PICKUP_RADIUS + PLAYER_HALF);

let toastTimer: number | null = null;
function showPickupToast(text: string): void {
  const el = document.getElementById("pickup-toast");
  if (!el) return;
  el.textContent = text;
  el.classList.add("show");
  if (toastTimer !== null) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    el.classList.remove("show");
    toastTimer = null;
  }, 2500);
}

function checkPickups(): void {
  const px = player.mesh.position.x;
  const pz = player.mesh.position.z;
  for (let i = 0; i < worldItems.length; i++) {
    const it = worldItems[i];
    if (!it || it.picked) continue;
    const dx = it.mesh.position.x - px;
    const dz = it.mesh.position.z - pz;
    if (dx * dx + dz * dz > PICKUP_DIST_SQ) continue;
    const def = itemById(it.itemId);
    const result = addItem(it.itemId, 1);
    it.picked = true;
    it.dispose();
    worldItems[i] = null;
    markPicked(i);
    if (def && result && result.delta > 0) {
      showPickupToast(`+${result.delta} ${def.name}`);
    }
  }
}

setupJoystick((v) => {
  player.setJoystick(v.active ? v.x : null, v.active ? v.y : undefined);
});

bindDialog(() => scheduleSave());
bindInventory();
bindSettings({ dayNight });

// P6.8 audio bootstrap. Browsers block AudioContext creation/resume until a
// user gesture, so we listen on a few options and start on whichever fires
// first (clicks count; pointerdown covers mouse + touch; keydown covers
// keyboard-only navigation including Playwright's trusted key events).
function bootAudio(): void {
  startAmbient();
  window.removeEventListener("pointerdown", bootAudio);
  window.removeEventListener("keydown", bootAudio);
  window.removeEventListener("touchstart", bootAudio);
}
window.addEventListener("pointerdown", bootAudio, { once: true });
window.addEventListener("keydown", bootAudio, { once: true });
window.addEventListener("touchstart", bootAudio, { once: true });

const volSlider = document.getElementById("hud-volume") as HTMLInputElement | null;
if (volSlider) {
  volSlider.value = String(Math.round(getMasterVolume() * 100));
  volSlider.addEventListener("input", () => {
    setMasterVolume(parseInt(volSlider.value, 10) / 100);
  });
}

// Seed the footstep cursor at the post-restore player position so the first
// real movement doesn't trigger a stale-distance step.
resetFootstepCursor(player.mesh.position.x, player.mesh.position.z);

// P6.6 — subscribe collect-quest auto-completer to inventory transitions.
// Bound after applySave so the restore's delta=0 emits do not double-process
// quests that were already complete at save time.
bindCollectAutoComplete();

// P6.5 auto-save: source provides live player XZ + dayNight phase; the
// module subscribes to quest + inventory transitions on its own and runs a
// 30s heartbeat tick. Writes coalesce through a 500ms debounce.
bindAutoSave({
  getPlayerXZ: () => ({ x: player.mesh.position.x, z: player.mesh.position.z }),
  getDayNightPhase: () => dayNight.currentPhase,
});

bindInteract((npc) => {
  const tavernNpc = interactables.find((n) => n.id === npc.id);
  if (tavernNpc) openDialog(tavernNpc.def);
});

// `?test=1` exposes a small hook for `scripts/validate-visual.mjs` to drive
// the dialog without needing to position the player next to an NPC.
if (typeof location !== "undefined" && new URLSearchParams(location.search).get("test") === "1") {
  interface ItemWorldPos {
    item_id: string;
    x: number;
    z: number;
    picked: boolean;
  }
  interface VoxelTestHook {
    openDialog: (npcId?: string) => void;
    acceptQuest: (questId: string) => boolean;
    getQuestState: typeof getQuestState;
    getQuests: typeof getQuests;
    getGold: () => number;
    movePlayerTo: (x: number, z: number) => void;
    getInventory: () => InventoryStack[];
    getItemCount: (id: string) => number;
    getItemWorldPositions: () => ItemWorldPos[];
    addItem: (id: string, count?: number) => void;
    openInventory: () => void;
    closeInventory: () => void;
    isInventoryOpen: () => boolean;
    flushSave: () => void;
    clearSave: () => void;
    getDayNightPhase: () => number;
    setDayNightPhase: (p: number) => void;
    getLanternIntensities: () => Array<{ label: string; intensity: number }>;
    getNpcPosition: (id: string) => { x: number; z: number } | null;
    getNpcCount: () => number;
  }
  const hook: VoxelTestHook = {
    openDialog: (npcId?: string) => {
      const target = npcId
        ? interactables.find((n) => n.id === npcId)
        : interactables[0];
      if (target) openDialog(target.def);
    },
    acceptQuest,
    getQuestState,
    getQuests,
    getGold,
    movePlayerTo: (x, z) => {
      player.mesh.position.x = x;
      player.mesh.position.z = z;
      resetFootstepCursor(x, z);
    },
    getInventory,
    getItemCount,
    // P6.5.1 — picked slots are pruned (post-pickup OR restored from save).
    // The test harness's "find first un-picked" pattern stays correct; new
    // post-reload assert in validate-visual.mjs checks the entry count drops
    // by exactly the number of picks persisted across reload.
    getItemWorldPositions: () =>
      worldItems.flatMap((it) =>
        it
          ? [{
              item_id: it.itemId,
              x: it.mesh.position.x,
              z: it.mesh.position.z,
              picked: it.picked,
            }]
          : [],
      ),
    addItem: (id, count = 1) => {
      addItem(id, count);
    },
    openInventory,
    closeInventory,
    isInventoryOpen,
    flushSave,
    clearSave,
    getDayNightPhase: () => dayNight.currentPhase,
    setDayNightPhase: (p) => {
      dayNight.setPhase(p);
      updateLanterns(lanterns, dayNight.currentPhase);
    },
    getLanternIntensities: () =>
      lanterns.map((l) => ({ label: l.label, intensity: l.light.intensity })),
    getNpcPosition: (id) => {
      const n = interactables.find((x) => x.id === id);
      return n ? { x: n.mesh.position.x, z: n.mesh.position.z } : null;
    },
    getNpcCount: () => interactables.length,
  };
  (window as unknown as { __voxelTest__?: VoxelTestHook }).__voxelTest__ = hook;
}

function updateCamera() {
  camera.position.copy(player.mesh.position).add(CAMERA_OFFSET);
  camera.lookAt(player.mesh.position);
}
updateCamera();

// Y-axis-only billboard face: each NPC mesh tracks a camera position with
// the same y so the plane only yaws, never tilts.
const billboardLook = new THREE.Vector3();
function faceBillboards() {
  for (const mesh of billboards) {
    billboardLook.copy(camera.position);
    billboardLook.y = mesh.position.y;
    mesh.lookAt(billboardLook);
  }
}
faceBillboards();

// P6.11 FPS overlay sampler — rolling 60-frame window of frame durations,
// render the HUD text every 10 frames so the readout doesn't jitter every
// frame. Hidden by default; backtick keydown toggles visibility.
const FPS_WINDOW = 60;
const FPS_RENDER_EVERY = 10;
const fpsWindow = new Float32Array(FPS_WINDOW);
let fpsWindowIdx = 0;
let fpsWindowFilled = 0;
let fpsRenderCounter = 0;

const MINIMAP_RENDER_EVERY = 10;
let minimapCounter = 0;
const LANTERN_LIT_THRESHOLD = 0.5;

function tickMinimap(): void {
  const npcsForMap = interactables.map((n) => ({
    worldX: n.mesh.position.x,
    worldZ: n.mesh.position.z,
  }));
  const itemsForMap: Array<{ worldX: number; worldZ: number }> = [];
  for (const it of worldItems) {
    if (!it || it.picked) continue;
    itemsForMap.push({ worldX: it.mesh.position.x, worldZ: it.mesh.position.z });
  }
  const lanternsForMap = lanterns.map((l) => ({
    worldX: l.light.position.x,
    worldZ: l.light.position.z,
    lit: l.light.intensity > LANTERN_LIT_THRESHOLD,
  }));
  minimap.update({
    player: { worldX: player.mesh.position.x, worldZ: player.mesh.position.z },
    npcs: npcsForMap,
    items: itemsForMap,
    lanterns: lanternsForMap,
  });
}
tickMinimap();

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

const bootMs = performance.now();
let last = bootMs;
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const t = (now - bootMs) / 1000;
  player.update(dt);
  dayNight.update(dt);
  updateLanterns(lanterns, dayNight.currentPhase);
  maybeStep(player.mesh.position.x, player.mesh.position.z);
  updateAmbient(dt, dayNight.currentPhase);
  for (const w of walkers) w.update(dt, player.mesh.position);
  updateInteract(player.mesh, interactables);
  for (const it of worldItems) {
    if (it && !it.picked) it.update(t);
  }
  checkPickups();
  updateCamera();
  faceBillboards();
  renderer.render(scene, camera);

  fpsWindow[fpsWindowIdx] = dt;
  fpsWindowIdx = (fpsWindowIdx + 1) % FPS_WINDOW;
  if (fpsWindowFilled < FPS_WINDOW) fpsWindowFilled++;
  minimapCounter++;
  if (minimapCounter >= MINIMAP_RENDER_EVERY) {
    minimapCounter = 0;
    tickMinimap();
  }

  fpsRenderCounter++;
  if (fpsRenderCounter >= FPS_RENDER_EVERY && isFpsOverlayVisible()) {
    fpsRenderCounter = 0;
    let sum = 0;
    for (let i = 0; i < fpsWindowFilled; i++) sum += fpsWindow[i];
    const avgDt = sum / fpsWindowFilled;
    const fps = avgDt > 0 ? Math.round(1 / avgDt) : 0;
    const ms = (avgDt * 1000).toFixed(1);
    const draw = renderer.info.render.calls;
    setFpsOverlayText(`${fps}fps · ${draw} draw · ${ms}ms`);
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDialog();
});

window.addEventListener("keydown", (e) => {
  if (e.code !== "Backquote" || e.repeat) return;
  if (isEditableTarget(e.target)) return;
  e.preventDefault();
  setFpsOverlayVisible(!isFpsOverlayVisible());
});

const spawnedItemCount = worldItems.reduce((n, it) => n + (it ? 1 : 0), 0);
console.log(
  `boot ok — Holtwick Voxel, ${interactables.length} NPCs, ${spawnedItemCount} items, ${trees.length} trees spawned`,
);
