import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { buildProceduralSky, type ProceduralSky } from "./sky";

export const CAMERA_PITCH_RAD = (55 * Math.PI) / 180;
export const CAMERA_DISTANCE = 18;

export const CAMERA_OFFSET = new THREE.Vector3(
  0,
  Math.cos(CAMERA_PITCH_RAD) * CAMERA_DISTANCE,
  Math.sin(CAMERA_PITCH_RAD) * CAMERA_DISTANCE,
);

// hermes/visual-pass #2: fog day/night palette. Densities tuned so the 64x64
// village stays readable: at d=0.012, atmospheric blend ≈30% across 50 units;
// at d=0.020 it ≈63% — dramatic at midnight without losing scene geometry.
const FOG_DAY_COLOR = new THREE.Color(0xa9c4d6);
const FOG_NIGHT_COLOR = new THREE.Color(0x0a1428);
const FOG_DAY_DENSITY = 0.012;
const FOG_NIGHT_DENSITY = 0.020;

export interface SceneBundle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  canvas: HTMLCanvasElement;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  sky: ProceduralSky;
  resize: () => void;
  // Interpolates FogExp2 color + density between day/night palettes using the
  // same `cos(phase * 2pi)` curve as DayNight's sun elevation, so fog tracks
  // the sun rather than being a second authority on time-of-day. Caller is
  // expected to invoke this from the RAF loop AND from any test hook that
  // scrubs phase synchronously (e.g. window.__voxelTest__.setDayNightPhase).
  updateFog: (phase: number) => void;
  dispose: () => void;
}

export function bootstrapScene(canvasSelector = "#game"): SceneBundle {
  const canvas = document.querySelector<HTMLCanvasElement>(canvasSelector);
  if (!canvas) {
    throw new Error(`bootstrapScene: canvas not found at ${canvasSelector}`);
  }

  const scene = new THREE.Scene();
  const sky = buildProceduralSky();
  scene.background = sky.texture;
  // hermes/visual-pass #2: exponential fog. Initial values = day palette;
  // updateFog() below interpolates per-frame.
  scene.fog = new THREE.FogExp2(FOG_DAY_COLOR.getHex(), FOG_DAY_DENSITY);

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
  // hermes/visual-pass #2: ACES filmic tone mapping. Compresses highlights
  // (sun-lit surfaces, lantern PointLight hot spots) into a film-style toe
  // and shoulder; with EffectComposer + OutputPass below handling the final
  // sRGB write, the perceived gamma stays correct.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  // hermes/visual-pass #2: EffectComposer post-processing chain.
  //   RenderPass    → draws scene+camera into the composer's HDR target
  //   UnrealBloomPass → samples bright pixels (threshold 0.7) and blooms them;
  //                     strength 0.5/radius 0.4 keeps day scenes natural while
  //                     letting emissives (iter #3) pop at night
  //   OutputPass    → tone-mapping + sRGB encoding for the final blit
  // Composer.setSize is called from `resize` below so DPR changes propagate.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
    0.5, // strength
    0.4, // radius
    0.7, // threshold
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  // hermes/visual-pass #2: fog interpolation. `day` matches DayNight's
  // `Math.max(0, cos(phase * 2pi))` curve so fog tracks sun elevation
  // instead of running its own schedule. Allocation-free — operates on the
  // FogExp2 instance attached to scene above.
  const fog = scene.fog as THREE.FogExp2;
  const updateFog = (phase: number): void => {
    const day = Math.max(0, Math.cos(phase * Math.PI * 2));
    fog.color.copy(FOG_NIGHT_COLOR).lerp(FOG_DAY_COLOR, day);
    fog.density = FOG_NIGHT_DENSITY + (FOG_DAY_DENSITY - FOG_NIGHT_DENSITY) * day;
  };
  updateFog(0); // noon baseline

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

  return { scene, camera, renderer, composer, canvas, sun, hemi, sky, resize, updateFog, dispose };
}
