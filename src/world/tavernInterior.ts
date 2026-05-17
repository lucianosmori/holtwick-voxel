import * as THREE from "three";
import {
  VOXEL_DIRT,
  VOXEL_EMPTY,
  VOXEL_PLANKS,
  VOXEL_STONE,
  type VoxelGrid,
  type VoxelType,
} from "./voxel";

interface InteriorStamp {
  readonly x: number;
  readonly z: number;
  readonly type: VoxelType;
}

// Tavern interior dressing (P9.1). Cells reference the absolute world grid:
// the tavern's interior occupies x=29..34, z=15..18 inside the wall ring
// stamped by addTavern. North-wall row (z=15) gets a 3-cell plank bar
// counter and a 2-cell stone hearth; south-wall row (z=17) gets 2 plank
// tables flanked by dirt stools. Middle row (z=16) and back row (z=18)
// stay clear so the player can step around the tables and reach the bar.
const INTERIOR_STAMPS: ReadonlyArray<InteriorStamp> = [
  { x: 29, z: 15, type: VOXEL_PLANKS }, // bar counter
  { x: 30, z: 15, type: VOXEL_PLANKS },
  { x: 31, z: 15, type: VOXEL_PLANKS },
  { x: 32, z: 15, type: VOXEL_STONE }, // hearth
  { x: 33, z: 15, type: VOXEL_STONE },
  { x: 30, z: 17, type: VOXEL_PLANKS }, // table
  { x: 32, z: 17, type: VOXEL_PLANKS }, // table
  { x: 29, z: 17, type: VOXEL_DIRT }, // stool
  { x: 31, z: 17, type: VOXEL_DIRT }, // stool
  { x: 31, z: 17, type: VOXEL_DIRT }, // stool (plan duplicate — skip-if-occupied makes it a no-op)
  { x: 33, z: 17, type: VOXEL_DIRT }, // stool
];

// Hearth occupies cells (32,15) + (33,15). PointLight sits half a cell
// south of the hearth's east block so it reads as warmth radiating into
// the open interior, not buried inside a solid voxel.
export const HEARTH_LIGHT_OFFSET = {
  cellX: 32,
  cellZ: 15,
  worldOffsetX: 1.0, // = cellX + 0.5 + 0.5 (plan spec)
  worldOffsetZ: 1.0,
  worldY: 1.5,
} as const;

export function addTavernInterior(grid: VoxelGrid): void {
  for (const stamp of INTERIOR_STAMPS) {
    if (!grid.inBounds(stamp.x, 1, stamp.z)) continue;
    // Defensive: don't overwrite anything addTavern (or a future stamp)
    // already planted in the interior — empty floors only.
    if (grid.get(stamp.x, 1, stamp.z) !== VOXEL_EMPTY) continue;
    grid.set(stamp.x, 1, stamp.z, stamp.type);
  }
}

export function buildHearthLight(gridOffset: THREE.Vector3): THREE.PointLight {
  const light = new THREE.PointLight(0xff8030, 0.9, 4);
  light.name = "tavern:hearth";
  light.position.set(
    gridOffset.x + HEARTH_LIGHT_OFFSET.cellX + HEARTH_LIGHT_OFFSET.worldOffsetX,
    HEARTH_LIGHT_OFFSET.worldY,
    gridOffset.z + HEARTH_LIGHT_OFFSET.cellZ + HEARTH_LIGHT_OFFSET.worldOffsetZ,
  );
  return light;
}
