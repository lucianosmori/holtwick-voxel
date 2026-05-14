import * as THREE from "three";

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
  resize: () => void;
  dispose: () => void;
}

export function bootstrapScene(canvasSelector = "#game"): SceneBundle {
  const canvas = document.querySelector<HTMLCanvasElement>(canvasSelector);
  if (!canvas) {
    throw new Error(`bootstrapScene: canvas not found at ${canvasSelector}`);
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111418);

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

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 10, 5);
  scene.add(ambient, dir);

  const dispose = () => {
    window.removeEventListener("resize", resize);
    renderer.dispose();
  };

  return { scene, camera, renderer, canvas, resize, dispose };
}
