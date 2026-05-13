import { bootstrapScene } from "./render/scene";
import { buildStarterRoom, STARTER_ROOM_WIDTH, STARTER_ROOM_DEPTH } from "./world/rooms";
import { buildVoxelMesh } from "./render/voxelMesh";

const { scene, camera, renderer } = bootstrapScene("#game");

const room = buildStarterRoom();
const roomMesh = buildVoxelMesh(room);
roomMesh.position.set(-STARTER_ROOM_WIDTH / 2, 0, -STARTER_ROOM_DEPTH / 2);
scene.add(roomMesh);

camera.lookAt(0, 0, 0);

function frame() {
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

console.log("boot ok");
