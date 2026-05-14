import * as THREE from "three";
import { bootstrapScene, CAMERA_OFFSET } from "./render/scene";
import { buildVillage, VILLAGE_DEPTH, VILLAGE_WIDTH } from "./world/village";
import { buildVoxelMesh } from "./render/voxelMesh";
import { Player } from "./entities/player";
import { BillboardNpc, NPC_Y } from "./entities/npc";

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
const npc = new BillboardNpc({
  label: "NPC",
  position: new THREE.Vector3(
    gridOffset.x + NPC_CELL_X + 0.5,
    NPC_Y,
    gridOffset.z + NPC_CELL_Z + 0.5,
  ),
});
scene.add(npc.mesh);

function updateCamera() {
  camera.position.copy(player.mesh.position).add(CAMERA_OFFSET);
  camera.lookAt(player.mesh.position);
}
updateCamera();
npc.faceCamera(camera);

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  player.update(dt);
  updateCamera();
  npc.faceCamera(camera);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

console.log("boot ok");
