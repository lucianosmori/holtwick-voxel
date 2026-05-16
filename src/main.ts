import * as THREE from "three";
import { bootstrapScene, CAMERA_OFFSET } from "./render/scene";
import { buildVillage, VILLAGE_DEPTH, VILLAGE_WIDTH } from "./world/village";
import { buildVoxelMesh } from "./render/voxelMesh";
import { Player } from "./entities/player";
import { BillboardNpc, NPC_Y } from "./entities/npc";
import { setupJoystick } from "./input/joystick";
import { bindInteract, updateInteract, type InteractableNpc } from "./ui/interact";
import { bindDialog, openDialog, closeDialog } from "./ui/dialog";
import { EDDA } from "./data/tavernCast";

const { scene, camera, renderer } = bootstrapScene("#game");

const VILLAGE_SEED = 1337;
const world = buildVillage(VILLAGE_SEED);
const worldMesh = buildVoxelMesh(world);
const gridOffset = new THREE.Vector3(-VILLAGE_WIDTH / 2, 0, -VILLAGE_DEPTH / 2);
worldMesh.position.copy(gridOffset);
scene.add(worldMesh);

const player = new Player(world, gridOffset);
player.attachKeyboard();
scene.add(player.mesh);

const NPC_CELL_X = Math.floor(VILLAGE_WIDTH / 2) + 6;
const NPC_CELL_Z = Math.floor(VILLAGE_DEPTH / 2) + 6;
const eddaNpc = new BillboardNpc({
  label: "Edda",
  position: new THREE.Vector3(
    gridOffset.x + NPC_CELL_X + 0.5,
    NPC_Y,
    gridOffset.z + NPC_CELL_Z + 0.5,
  ),
});
scene.add(eddaNpc.mesh);

interface InteractableTavernNpc extends InteractableNpc {
  def: typeof EDDA;
}
const interactables: InteractableTavernNpc[] = [
  { id: EDDA.id, name: EDDA.name, mesh: eddaNpc.mesh, def: EDDA },
];

setupJoystick((v) => {
  player.setJoystick(v.active ? v.x : null, v.active ? v.y : undefined);
});

bindDialog(() => {
  // Dialog closed — nothing to clean up yet, hook reserved for WebLLM teardown.
});

bindInteract((npc) => {
  const tavernNpc = interactables.find((n) => n.id === npc.id);
  if (tavernNpc) openDialog(tavernNpc.def);
});

// `?test=1` exposes a small hook for `scripts/validate-visual.mjs` to drive
// the dialog without needing to position the player next to the NPC.
if (typeof location !== "undefined" && new URLSearchParams(location.search).get("test") === "1") {
  (window as unknown as { __voxelTest__?: { openDialog: () => void } }).__voxelTest__ = {
    openDialog: () => openDialog(EDDA),
  };
}

function updateCamera() {
  camera.position.copy(player.mesh.position).add(CAMERA_OFFSET);
  camera.lookAt(player.mesh.position);
}
updateCamera();
eddaNpc.faceCamera(camera);

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  player.update(dt);
  updateInteract(player.mesh, interactables);
  updateCamera();
  eddaNpc.faceCamera(camera);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Esc closes the dialog when open — handled inside dialog.ts, but
// re-asserting here is harmless and explicit.
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDialog();
});

console.log("boot ok");
