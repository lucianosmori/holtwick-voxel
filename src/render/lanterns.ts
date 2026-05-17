import * as THREE from "three";
import {
  TAVERN_DOORWAY_X,
  TAVERN_ORIGIN_Z,
  VILLAGE_DEPTH,
  VILLAGE_WIDTH,
} from "../world/village";
import { TAVERN_INTERIOR_DEPTH } from "../world/tavern";

export const LANTERN_COLOR = 0xffb070;
export const LANTERN_RANGE = 6;
export const LANTERN_MAX_INTENSITY = 1.5;
export const LANTERN_HEIGHT_Y = 3;

const PLAZA_HALF = 10;

const cx = Math.floor(VILLAGE_WIDTH / 2);
const cz = Math.floor(VILLAGE_DEPTH / 2);

// One-cell-south of the tavern doorway so the warm pool falls on the
// approach, not inside the building.
const tavernDoorCellX = TAVERN_DOORWAY_X;
const tavernDoorCellZ = TAVERN_ORIGIN_Z + (TAVERN_INTERIOR_DEPTH + 2);

const LANTERN_CELLS: ReadonlyArray<{ readonly cellX: number; readonly cellZ: number; readonly label: string }> = [
  { cellX: tavernDoorCellX, cellZ: tavernDoorCellZ, label: "tavern_door" },
  { cellX: cx + PLAZA_HALF - 1, cellZ: cz - PLAZA_HALF, label: "plaza_ne" },
  { cellX: cx - PLAZA_HALF, cellZ: cz - PLAZA_HALF, label: "plaza_nw" },
  { cellX: cx + PLAZA_HALF - 1, cellZ: cz + PLAZA_HALF - 1, label: "plaza_se" },
];

export interface Lantern {
  readonly light: THREE.PointLight;
  readonly label: string;
}

export function buildLanterns(gridOffset: THREE.Vector3): Lantern[] {
  return LANTERN_CELLS.map(({ cellX, cellZ, label }) => {
    const light = new THREE.PointLight(LANTERN_COLOR, 0, LANTERN_RANGE);
    light.position.set(
      gridOffset.x + cellX + 0.5,
      LANTERN_HEIGHT_Y,
      gridOffset.z + cellZ + 0.5,
    );
    return { light, label };
  });
}

// Smooth nightness ramp: 0 during full day, 1 at midnight, with onset at
// dusk and falloff at dawn. Built on the same elevation curve the sun uses
// (`cos(phase * 2π)`) so the lanterns ignite as the sun dips toward the
// horizon rather than waiting for full dark.
//
// Phase convention (from src/world/dayNight.ts): 0=noon, 0.25=dusk,
// 0.5=midnight, 0.75=dawn.
export function lanternIntensityForPhase(phase: number): number {
  if (!Number.isFinite(phase)) return 0;
  const elevation = Math.cos(phase * Math.PI * 2);
  // Shift by 0.3 so intensity already passes 0 once the sun is ~70% of the
  // way down — gives the dusk pool a chance to read before the scene goes
  // dark, and matches the dawn falloff symmetrically.
  const raw = -elevation + 0.3;
  if (raw <= 0) return 0;
  if (raw >= 1) return LANTERN_MAX_INTENSITY;
  return raw * LANTERN_MAX_INTENSITY;
}

export function updateLanterns(lanterns: ReadonlyArray<Lantern>, phase: number): void {
  const intensity = lanternIntensityForPhase(phase);
  for (const l of lanterns) l.light.intensity = intensity;
}
