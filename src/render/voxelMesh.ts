import * as THREE from "three";
import {
  VOXEL_DIRT,
  VOXEL_EMPTY,
  VOXEL_FLOOR,
  VOXEL_PLANKS,
  VOXEL_WALL,
  VOXEL_WATER,
  type VoxelGrid,
} from "../world/voxel";
import grassUrl from "../../assets/voxel/PNG/Green/texture_01.png?url";
import stoneUrl from "../../assets/voxel/PNG/Light/texture_06.png?url";
import dirtUrl from "../../assets/voxel/PNG/Dark/texture_05.png?url";
import planksUrl from "../../assets/voxel/PNG/Orange/texture_04.png?url";

export interface VoxelPaletteEntry {
  readonly color?: number;
  readonly textureUrl?: string;
  readonly roughness?: number;
  readonly metalness?: number;
}

export type VoxelPalette = Readonly<Record<number, VoxelPaletteEntry>>;

export const DEFAULT_VOXEL_PALETTE: VoxelPalette = {
  [VOXEL_FLOOR]: { textureUrl: grassUrl, roughness: 0.95 },
  [VOXEL_WALL]: { textureUrl: stoneUrl, roughness: 0.9 },
  [VOXEL_DIRT]: { textureUrl: dirtUrl, roughness: 0.95 },
  [VOXEL_PLANKS]: { textureUrl: planksUrl, roughness: 0.85 },
  [VOXEL_WATER]: { color: 0x3a6da6, roughness: 0.3, metalness: 0.1 },
};

const SHARED_BOX = new THREE.BoxGeometry(1, 1, 1);

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map<string, THREE.Texture>();

function loadVoxelTexture(url: string): THREE.Texture {
  const cached = textureCache.get(url);
  if (cached) return cached;
  const tex = textureLoader.load(url);
  // Kenney mini-block textures are tiny pixel art — keep them crisp.
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapNearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  textureCache.set(url, tex);
  return tex;
}

function buildMaterial(entry: VoxelPaletteEntry): THREE.MeshStandardMaterial {
  const params: THREE.MeshStandardMaterialParameters = {
    roughness: entry.roughness ?? 1,
    metalness: entry.metalness ?? 0,
  };
  if (entry.textureUrl) params.map = loadVoxelTexture(entry.textureUrl);
  if (entry.color !== undefined) params.color = entry.color;
  return new THREE.MeshStandardMaterial(params);
}

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
    const material = buildMaterial(entry);
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
