import * as THREE from "three";
import {
  TAVERN_ORIGIN_X,
  TAVERN_ORIGIN_Z,
  VILLAGE_DEPTH,
  VILLAGE_WIDTH,
} from "../world/village";
import {
  TAVERN_INTERIOR_DEPTH,
  TAVERN_INTERIOR_WIDTH,
} from "../world/tavern";

// hermes/visual-pass #3: emissive windows + lantern glow meshes.
// Small emissive boxes inside lanterns and tavern-window quads that bloom
// under UnrealBloomPass.  Intensity is phase-ramped so they only read at
// night (their PointLights handle the actual illumination; these meshes
// provide the visible emissive bloom).

export interface EmissiveElement {
  readonly mesh: THREE.Mesh;
  readonly baseIntensity: number;
}

// ── Lantern glow cubes ────────────────────────────────────────────────────
// Matches LANTERN_CELLS in src/render/lanterns.ts
const PLAZA_HALF = 10;
const cx = Math.floor(VILLAGE_WIDTH / 2);
const cz = Math.floor(VILLAGE_DEPTH / 2);
const tavernDoorCellX = TAVERN_ORIGIN_X + TAVERN_INTERIOR_WIDTH / 2 | 0;
const tavernDoorCellZ = TAVERN_ORIGIN_Z + TAVERN_INTERIOR_DEPTH + 2;

const LANTERN_CELLS: ReadonlyArray<{ readonly cellX: number; readonly cellZ: number }> = [
  { cellX: tavernDoorCellX, cellZ: tavernDoorCellZ },
  { cellX: cx + PLAZA_HALF - 1, cellZ: cz - PLAZA_HALF },
  { cellX: cx - PLAZA_HALF, cellZ: cz - PLAZA_HALF },
  { cellX: cx + PLAZA_HALF - 1, cellZ: cz + PLAZA_HALF - 1 },
];

const LANTERN_GLOW_COLOR = 0xffb070;
const LANTERN_GLOW_SIZE = 0.2;

// ── Tavern window emissives ───────────────────────────────────────────────
// Two windows on the east wall (x = interiorMaxX, z = 15,16).
// These match the tavern interior bar/hearth wall so they read as interior
// warmth leaking through.
const WINDOW_CELLS: ReadonlyArray<{ readonly cellX: number; readonly cellZ: number }> = [
  { cellX: TAVERN_ORIGIN_X + TAVERN_INTERIOR_WIDTH + 1, cellZ: TAVERN_ORIGIN_Z + 1 },
  { cellX: TAVERN_ORIGIN_X + TAVERN_INTERIOR_WIDTH + 1, cellZ: TAVERN_ORIGIN_Z + 2 },
];

const WINDOW_COLOR = 0xffe8a0;
const WINDOW_WIDTH = 0.8;
const WINDOW_HEIGHT = 0.6;

// ── Builder ───────────────────────────────────────────────────────────────
export function buildEmissives(gridOffset: THREE.Vector3): EmissiveElement[] {
  const elements: EmissiveElement[] = [];

  // Lantern glow cubes:
  const lanternGeom = new THREE.BoxGeometry(LANTERN_GLOW_SIZE, LANTERN_GLOW_SIZE, LANTERN_GLOW_SIZE);
  const lanternMat = new THREE.MeshBasicMaterial({ color: LANTERN_GLOW_COLOR });
  for (const c of LANTERN_CELLS) {
    const mesh = new THREE.Mesh(lanternGeom, lanternMat.clone());
    mesh.position.set(
      gridOffset.x + c.cellX + 0.5,
      3, // lantern height
      gridOffset.z + c.cellZ + 0.5,
    );
    elements.push({ mesh, baseIntensity: 1.0 });
  }

  // Tavern window emissive planes:
  const windowGeom = new THREE.PlaneGeometry(WINDOW_WIDTH, WINDOW_HEIGHT);
  const windowMat = new THREE.MeshBasicMaterial({
    color: WINDOW_COLOR,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  });
  for (const c of WINDOW_CELLS) {
    const mesh = new THREE.Mesh(windowGeom, windowMat.clone());
    // East wall outer face — position just outside the voxel wall
    mesh.position.set(
      gridOffset.x + c.cellX + 0.02, // slightly outside wall
      1.8, // window height = between floor (y=0) and roof top (y=3)
      gridOffset.z + c.cellZ + 0.5,
    );
    // Face outward — east wall normal = +X
    mesh.rotation.y = Math.PI / 2;
    elements.push({ mesh, baseIntensity: 0.8 });
  }

  return elements;
}

// Same day/night ramp curve as lanterns/lamp posts.  Returns 0..1 factor.
export function emissiveIntensityForPhase(phase: number, baseIntensity: number): number {
  if (!Number.isFinite(phase)) return 0;
  const elevation = Math.cos(phase * Math.PI * 2);
  const raw = -elevation + 0.3;
  if (raw <= 0) return 0;
  if (raw >= 1) return baseIntensity;
  return raw * baseIntensity;
}

export function updateEmissives(emissives: ReadonlyArray<EmissiveElement>, phase: number): void {
  for (const e of emissives) {
    e.mesh.visible = phase > 0.55 || phase < 0.05; // quick off during bright day
  }
}
