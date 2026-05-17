import * as THREE from "three";
import {
  TAVERN_DOORWAY_X,
  TAVERN_ORIGIN_Z,
} from "./village";
import { TAVERN_INTERIOR_DEPTH } from "./tavern";

// P8.5 — tavern sign at the doorway + 4 lamp posts along the main N/S road.
// Lamp posts add a PointLight each that ramps with day/night phase (mirrors
// the [[lanterns]] curve so the cluster ignites in lockstep). Lamps live on
// the west edge cell of the N/S road (cellX=29) at z values that avoid the
// tavern footprint (z=14..19) and the plaza ring (z=22..41).

export const TAVERN_SIGN_TEXT = "The Holtwick Tavern";
export const TAVERN_SIGN_WIDTH = 1.5;
export const TAVERN_SIGN_HEIGHT = 0.6;
export const TAVERN_SIGN_Y = 3;

export const LAMP_POST_HEIGHT = 4;
export const LAMP_POST_BASE_Y = 1;
export const LAMP_LIGHT_COLOR = 0xfff0a0;
export const LAMP_LIGHT_RANGE = 6;
export const LAMP_MAX_INTENSITY = 1.2;

export interface LampPost {
  readonly cellX: number;
  readonly cellZ: number;
  readonly label: string;
  readonly light: THREE.PointLight;
}

const LAMP_CELLS: ReadonlyArray<{ cellX: number; cellZ: number; label: string }> = [
  { cellX: 29, cellZ: 4, label: "road_n_far" },
  { cellX: 29, cellZ: 12, label: "road_n_near" },
  { cellX: 29, cellZ: 44, label: "road_s_near" },
  { cellX: 29, cellZ: 52, label: "road_s_far" },
];

function paintWoodGrain(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = "#6b3a1c";
  ctx.fillRect(0, 0, w, h);
  // Deterministic horizontal grain — fixed phase per row so the texture is
  // identical across reloads / test runs.
  ctx.strokeStyle = "rgba(50, 24, 8, 0.55)";
  ctx.lineWidth = 1;
  for (let y = 6; y < h; y += 6) {
    const dy = (y * 0.13) % 2 - 1; // tiny zigzag, deterministic
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w * 0.5, y + dy);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  // Border frame so the plank reads as a hung sign, not a flat panel.
  ctx.strokeStyle = "#2a1407";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);
}

function makeSignTexture(text: string): THREE.CanvasTexture {
  const w = 256;
  const h = Math.round(w * (TAVERN_SIGN_HEIGHT / TAVERN_SIGN_WIDTH)); // keeps aspect
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("makeSignTexture: 2d context unavailable");
  paintWoodGrain(ctx, w, h);
  ctx.fillStyle = "#f5e6c8";
  ctx.font = `bold ${Math.floor(h * 0.5)}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2 + 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildTavernSign(gridOffset: THREE.Vector3): THREE.Mesh {
  const tex = makeSignTexture(TAVERN_SIGN_TEXT);
  const geo = new THREE.PlaneGeometry(TAVERN_SIGN_WIDTH, TAVERN_SIGN_HEIGHT);
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "tavern_sign";
  // South wall outer face: TAVERN_ORIGIN_Z + footprintDepth (footprintDepth =
  // interiorDepth + 2). Sign hangs a hair south of that so it reads from the
  // plaza approach without z-fighting the wall.
  const southWallOuterZ = TAVERN_ORIGIN_Z + TAVERN_INTERIOR_DEPTH + 2;
  mesh.position.set(
    gridOffset.x + TAVERN_DOORWAY_X + 0.5,
    TAVERN_SIGN_Y,
    gridOffset.z + southWallOuterZ + 0.05,
  );
  // Plane default normal is +Z which is south in world coords here — no
  // rotation needed. Player approaching from the plaza (negative Z direction
  // toward tavern) sees the front face.
  return mesh;
}

export interface LampPostResult {
  readonly postMesh: THREE.InstancedMesh;
  readonly lamps: LampPost[];
}

const POST_GEOMETRY = new THREE.BoxGeometry(1, LAMP_POST_HEIGHT, 1);

export function buildLampPosts(gridOffset: THREE.Vector3): LampPostResult {
  const mat = new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 0.9 });
  const postMesh = new THREE.InstancedMesh(POST_GEOMETRY, mat, LAMP_CELLS.length);
  postMesh.name = "lamp_posts";
  postMesh.castShadow = true;
  postMesh.receiveShadow = true;

  const lamps: LampPost[] = [];
  const matrix = new THREE.Matrix4();
  const postCenterY = LAMP_POST_BASE_Y + LAMP_POST_HEIGHT / 2;
  const lightY = LAMP_POST_BASE_Y + LAMP_POST_HEIGHT - 0.2;

  for (let i = 0; i < LAMP_CELLS.length; i++) {
    const c = LAMP_CELLS[i];
    const wx = gridOffset.x + c.cellX + 0.5;
    const wz = gridOffset.z + c.cellZ + 0.5;
    matrix.makeTranslation(wx, postCenterY, wz);
    postMesh.setMatrixAt(i, matrix);
    const light = new THREE.PointLight(LAMP_LIGHT_COLOR, 0, LAMP_LIGHT_RANGE);
    light.position.set(wx, lightY, wz);
    lamps.push({ cellX: c.cellX, cellZ: c.cellZ, label: c.label, light });
  }
  postMesh.instanceMatrix.needsUpdate = true;
  return { postMesh, lamps };
}

// Same elevation curve the tavern/plaza lanterns use — onset at dusk, peak at
// midnight. Kept independent of LANTERN_MAX_INTENSITY so lamp posts can be
// retuned without dragging the existing lanterns.
export function lampIntensityForPhase(phase: number): number {
  if (!Number.isFinite(phase)) return 0;
  const elevation = Math.cos(phase * Math.PI * 2);
  const raw = -elevation + 0.3;
  if (raw <= 0) return 0;
  if (raw >= 1) return LAMP_MAX_INTENSITY;
  return raw * LAMP_MAX_INTENSITY;
}

export function updateLampPosts(lamps: ReadonlyArray<LampPost>, phase: number): void {
  const intensity = lampIntensityForPhase(phase);
  for (const l of lamps) l.light.intensity = intensity;
}
