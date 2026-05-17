import * as THREE from "three";
import { bootstrapScene, CAMERA_OFFSET } from "./render/scene";
import { buildVillage, computeItemSpawns, VILLAGE_DEPTH, VILLAGE_WIDTH, type ItemSpawn } from "./world/village";
import { buildVoxelMesh } from "./render/voxelMesh";
import { Player, PLAYER_HALF } from "./entities/player";
import { BillboardNpc, NPC_Y } from "./entities/npc";
import { setupJoystick } from "./input/joystick";
import { bindInteract, updateInteract, type InteractableNpc } from "./ui/interact";
import { bindDialog, openDialog, closeDialog } from "./ui/dialog";
import { bindInventory, openInventory, closeInventory, isInventoryOpen } from "./ui/inventory";
import { NPC_SPAWNS } from "./data/npcSpawns";
import type { NpcDef } from "./data/npc.schema";
import { DayNight } from "./world/dayNight";
import { bindTitle } from "./ui/title";
import { mountHud } from "./ui/hud";
import { acceptQuest, getGold, getQuestState, getQuests } from "./game/quests";
import { itemById } from "./data/items";
import { addItem, getInventory, getItemCount, type InventoryStack } from "./game/inventory";
import { ITEM_BASE_Y, PICKUP_RADIUS, WorldItem } from "./entities/worldItem";

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

interface InteractableTavernNpc extends InteractableNpc {
  def: NpcDef;
}

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
const worldItems: WorldItem[] = [];
for (const spawn of itemSpawns) {
  const def = itemById(spawn.item_id);
  if (!def) continue;
  const pos = new THREE.Vector3(
    gridOffset.x + spawn.cellX + 0.5,
    ITEM_BASE_Y,
    gridOffset.z + spawn.cellZ + 0.5,
  );
  const item = new WorldItem(def, pos);
  worldItems.push(item);
  scene.add(item.mesh);
}

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
  for (const it of worldItems) {
    if (it.picked) continue;
    const dx = it.mesh.position.x - px;
    const dz = it.mesh.position.z - pz;
    if (dx * dx + dz * dz > PICKUP_DIST_SQ) continue;
    const def = itemById(it.itemId);
    const result = addItem(it.itemId, 1);
    it.picked = true;
    it.dispose();
    if (def && result && result.delta > 0) {
      showPickupToast(`+${result.delta} ${def.name}`);
    }
  }
}

setupJoystick((v) => {
  player.setJoystick(v.active ? v.x : null, v.active ? v.y : undefined);
});

bindDialog(() => {});
bindInventory();

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
    },
    getInventory,
    getItemCount,
    getItemWorldPositions: () =>
      worldItems.map((it) => ({
        item_id: it.itemId,
        x: it.mesh.position.x,
        z: it.mesh.position.z,
        picked: it.picked,
      })),
    addItem: (id, count = 1) => {
      addItem(id, count);
    },
    openInventory,
    closeInventory,
    isInventoryOpen,
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

const bootMs = performance.now();
let last = bootMs;
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const t = (now - bootMs) / 1000;
  player.update(dt);
  dayNight.update(dt);
  updateInteract(player.mesh, interactables);
  for (const it of worldItems) {
    if (!it.picked) it.update(t);
  }
  checkPickups();
  updateCamera();
  faceBillboards();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDialog();
});

console.log(`boot ok — Holtwick Voxel, ${interactables.length} NPCs, ${worldItems.length} items spawned`);
