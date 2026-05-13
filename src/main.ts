import * as THREE from "three";
import { bootstrapScene } from "./render/scene";

const { scene, camera, renderer } = bootstrapScene("#game");

const refCube = new THREE.Mesh(
  new THREE.BoxGeometry(2, 2, 2),
  new THREE.MeshStandardMaterial({ color: 0x48c0ff }),
);
scene.add(refCube);

let prev = performance.now();
function frame(now: number) {
  const dt = (now - prev) / 1000;
  prev = now;
  refCube.rotation.y += dt * 0.6;
  refCube.rotation.x += dt * 0.3;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

console.log("boot ok");
