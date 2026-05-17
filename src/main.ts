import * as THREE from "three";
import { bootstrapScene, CAMERA_OFFSET } from "./render/scene";
import { buildVillage, VILLAGE_DEPTH, VILLAGE_WIDTH } from "./world/village";
import { buildVoxelMesh } from "./render/voxelMesh";
import { Player } from "./entities/player";
import { BillboardNpc, NPC_Y } from "./entities/npc";
import { setupJoystick } from "./input/joystick";
import { bindInteract, updateInteract, type InteractableNpc } from "./ui/interact";
import { bindDialog, openDialog, closeDialog } from "./ui/dialog";
import { NPC_SPAWNS } from "./data/npcSpawns";
import type { NpcDef } from "./data/npc.schema";
import { DayNight } from "./world/dayNight";
import { bindTitle } from "./ui/title";
import { mountHud } from "./ui/hud";
import { acceptQuest, getGold, getQuestState, getQuests } from "./game/quests";

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

setupJoystick((v) => {
  player.setJoystick(v.active ? v.x : null, v.active ? v.y : undefined);
});

bindDialog(() => {});

bindInteract((npc) => {
  const tavernNpc = interactables.find((n) => n.id === npc.id);
  if (tavernNpc) openDialog(tavernNpc.def);
});

// `?test=1` exposes a small hook for `scripts/validate-visual.mjs` to drive
// the dialog without needing to position the player next to an NPC.
if (typeof location !== "undefined" && new URLSearchParams(location.search).get("test") === "1") {
  interface VoxelTestHook {
    openDialog: (npcId?: string) => void;
    acceptQuest: (questId: string) => boolean;
    getQuestState: typeof getQuestState;
    getQuests: typeof getQuests;
    getGold: () => number;
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

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  player.update(dt);
  dayNight.update(dt);
  updateInteract(player.mesh, interactables);
  updateCamera();
  faceBillboards();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDialog();
});

console.log("boot ok — Holtwick Voxel, 7 NPCs spawned");
