import * as THREE from "three";
import {
  VOXEL_EMPTY,
  VOXEL_FLOOR,
  VOXEL_WALL,
  type VoxelGrid,
} from "../world/voxel";

export interface VoxelPaletteEntry {
  readonly color: number;
  readonly roughness?: number;
  readonly metalness?: number;
}

export type VoxelPalette = Readonly<Record<number, VoxelPaletteEntry>>;

export const DEFAULT_VOXEL_PALETTE: VoxelPalette = {
  [VOXEL_FLOOR]: { color: 0x6b6259, roughness: 0.95 },
  [VOXEL_WALL]: { color: 0x3a3733, roughness: 0.9 },
};

const SHARED_BOX = new THREE.BoxGeometry(1, 1, 1);

function countByType(grid: VoxelGrid, palette: VoxelPalette): Map<number, number> {
  const counts = new Map<number, number>();
  for (const key of Object.keys(palette)) {
    counts.set(Number(key), 0);
  }
  const { width, height, depth } = grid.dims;
  for (let y = 0; y < height; y++) {
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        const v = grid.get(x, y, z);
        if (v === VOXEL_EMPTY) continue;
        if (counts.has(v)) counts.set(v, counts.get(v)! + 1);
      }
    }
  }
  return counts;
}

export function buildVoxelMesh(
  grid: VoxelGrid,
  palette: VoxelPalette = DEFAULT_VOXEL_PALETTE,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "voxelMesh";

  const counts = countByType(grid, palette);
  const meshes = new Map<number, { mesh: THREE.InstancedMesh; cursor: number }>();

  for (const [typeStr, entry] of Object.entries(palette)) {
    const type = Number(typeStr);
    const total = counts.get(type) ?? 0;
    if (total === 0) continue;
    const material = new THREE.MeshStandardMaterial({
      color: entry.color,
      roughness: entry.roughness ?? 1,
      metalness: entry.metalness ?? 0,
    });
    const mesh = new THREE.InstancedMesh(SHARED_BOX, material, total);
    mesh.name = `voxel:${type}`;
    mesh.count = 0;
    meshes.set(type, { mesh, cursor: 0 });
  }

  const matrix = new THREE.Matrix4();
  const { width, height, depth } = grid.dims;
  for (let y = 0; y < height; y++) {
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        const v = grid.get(x, y, z);
        if (v === VOXEL_EMPTY) continue;
        const slot = meshes.get(v);
        if (!slot) continue;
        matrix.makeTranslation(x + 0.5, y + 0.5, z + 0.5);
        slot.mesh.setMatrixAt(slot.cursor, matrix);
        slot.cursor++;
      }
    }
  }

  for (const [, slot] of meshes) {
    slot.mesh.count = slot.cursor;
    slot.mesh.instanceMatrix.needsUpdate = true;
    group.add(slot.mesh);
  }

  return group;
}
