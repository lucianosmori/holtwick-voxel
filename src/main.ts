import * as THREE from "three";
import { bootstrapScene, CAMERA_OFFSET } from "./render/scene";
import { buildStarterRoom, STARTER_ROOM_WIDTH, STARTER_ROOM_DEPTH } from "./world/rooms";
import { buildVoxelMesh } from "./render/voxelMesh";
import { Player } from "./entities/player";

const { scene, camera, renderer } = bootstrapScene("#game");

const room = buildStarterRoom();
const roomMesh = buildVoxelMesh(room);
const gridOffset = new THREE.Vector3(-STARTER_ROOM_WIDTH / 2, 0, -STARTER_ROOM_DEPTH / 2);
roomMesh.position.copy(gridOffset);
scene.add(roomMesh);

const player = new Player(room, gridOffset);
player.attachKeyboard();
scene.add(player.mesh);

function updateCamera() {
  camera.position.copy(player.mesh.position).add(CAMERA_OFFSET);
  camera.lookAt(player.mesh.position);
}
updateCamera();

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  player.update(dt);
  updateCamera();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

console.log("boot ok");
