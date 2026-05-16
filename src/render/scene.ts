import * as THREE from "three";
import { buildProceduralSky } from "./sky";

export const CAMERA_PITCH_RAD = (55 * Math.PI) / 180;
export const CAMERA_DISTANCE = 18;

export const CAMERA_OFFSET = new THREE.Vector3(
  0,
  Math.cos(CAMERA_PITCH_RAD) * CAMERA_DISTANCE,
  Math.sin(CAMERA_PITCH_RAD) * CAMERA_DISTANCE,
);

export interface SceneBundle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  canvas: HTMLCanvasElement;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  resize: () => void;
  dispose: () => void;
}

export function bootstrapScene(canvasSelector = "#game"): SceneBundle {
  const canvas = document.querySelector<HTMLCanvasElement>(canvasSelector);
  if (!canvas) {
    throw new Error(`bootstrapScene: canvas not found at ${canvasSelector}`);
  }

  const scene = new THREE.Scene();
  scene.background = buildProceduralSky();

  const camera = new THREE.PerspectiveCamera(
    55,
    canvas.clientWidth / Math.max(1, canvas.clientHeight),
    0.1,
    500,
  );
  camera.position.copy(CAMERA_OFFSET);
  camera.lookAt(0, 0, 0);

  // `preserveDrawingBuffer` keeps the canvas content readable after compositing,
  // which is required for headless screenshot tools (Playwright validate:visual)
  // that snapshot outside the renderer's RAF tick. Enabled only when the URL
  // carries `?test=1` so production keeps the default fast path.
  const isTestRun =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("test");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: isTestRun,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  // Hemisphere fills sky/ground tint cheaply; directional acts as the sun
  // with shadow mapping so player + walls cast across the floor.
  const hemi = new THREE.HemisphereLight(0xbcd6ff, 0x4a3a2a, 0.4);
  hemi.position.set(0, 50, 0);

  const sun = new THREE.DirectionalLight(0xffeecc, 1.2);
  sun.position.set(-30, 50, -30); // high-southwest of the centered 64x64 village
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const shadowExtent = 40; // covers the 64x64 village (±32) with margin
  sun.shadow.camera.left = -shadowExtent;
  sun.shadow.camera.right = shadowExtent;
  sun.shadow.camera.top = shadowExtent;
  sun.shadow.camera.bottom = -shadowExtent;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 140;
  sun.shadow.bias = -0.0005;
  scene.add(hemi, sun, sun.target);

  const dispose = () => {
    window.removeEventListener("resize", resize);
    renderer.dispose();
  };

  return { scene, camera, renderer, canvas, sun, hemi, resize, dispose };
}
