import * as THREE from "three";
import {
  VOXEL_DIRT,
  VOXEL_EMPTY,
  VOXEL_FLOOR,
  type VoxelGrid,
} from "./voxel";
import { VILLAGE_DEPTH, VILLAGE_WIDTH } from "./village";
import dirtUrl from "../../assets/voxel/PNG/Dark/texture_05.png?url";

export interface TreePlacement {
  cellX: number;
  cellZ: number;
}

export const TREE_COUNT_DEFAULT = 30;

const ROAD_BUFFER = 2;
const PLAZA_BUFFER = 8;
const NPC_BUFFER = 3;
const ITEM_BUFFER = 3;
const MAX_ATTEMPTS = 800;

const TRUNK_HEIGHT = 4;
const CANOPY_LAYERS = 2;
// 3×3 footprint minus 4 corner columns minus the trunk-center column = 4 outer
// orthogonal cells per layer (the canopy "plus" minus its centre). 4 × 2 = 8
// canopy cubes per tree — matches the spec "8 green-tinted cubes around the
// top for canopy".
const CANOPY_OFFSETS: ReadonlyArray<[number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nearDirt(grid: VoxelGrid, x: number, z: number, r: number): boolean {
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      if (grid.get(x + dx, 0, z + dz) === VOXEL_DIRT) return true;
    }
  }
  return false;
}

// Deterministic foliage placement on the village grid. Walks a separate
// mulberry32 stream (seed = villageSeed + 7331 by caller) so trees don't
// reshuffle if NPCs or items move. A tree is rejected unless its base cell is
// plain grass (VOXEL_FLOOR) at y=0 AND the entire column above is empty —
// keeps trees off pond water, dirt paths, stone plaza, plank tavern floor, and
// tavern walls. Buffer rules per spec: ≥3 cells from any NPC spawn, ≥3 cells
// from any item spawn, ≥3 cells from any dirt road (so the road corridor
// stays walkable), and ≥9 cells from plaza centre on each axis (Chebyshev
// 8-cell buffer outside the 10-cell plaza half-width).
export function computeFoliage(
  seed: number,
  grid: VoxelGrid,
  npcCells: ReadonlyArray<{ cellX: number; cellZ: number }>,
  itemCells: ReadonlyArray<{ cellX: number; cellZ: number }>,
  count: number = TREE_COUNT_DEFAULT,
): TreePlacement[] {
  const rand = mulberry32(seed >>> 0);
  const cx = Math.floor(VILLAGE_WIDTH / 2);
  const cz = Math.floor(VILLAGE_DEPTH / 2);
  const trees: TreePlacement[] = [];
  const used = new Set<string>();
  let attempts = 0;
  while (trees.length < count && attempts < MAX_ATTEMPTS) {
    attempts++;
    const x = Math.floor(rand() * VILLAGE_WIDTH);
    const z = Math.floor(rand() * VILLAGE_DEPTH);
    const key = `${x},${z}`;
    if (used.has(key)) continue;
    if (grid.get(x, 0, z) !== VOXEL_FLOOR) continue;
    let blocked = false;
    for (let y = 1; y < grid.dims.height; y++) {
      if (grid.get(x, y, z) !== VOXEL_EMPTY) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;
    if (Math.abs(x - cx) <= PLAZA_BUFFER && Math.abs(z - cz) <= PLAZA_BUFFER) continue;
    if (nearDirt(grid, x, z, ROAD_BUFFER)) continue;
    let nearActor = false;
    for (const n of npcCells) {
      if (Math.abs(x - n.cellX) <= NPC_BUFFER && Math.abs(z - n.cellZ) <= NPC_BUFFER) {
        nearActor = true;
        break;
      }
    }
    if (nearActor) continue;
    for (const it of itemCells) {
      if (Math.abs(x - it.cellX) <= ITEM_BUFFER && Math.abs(z - it.cellZ) <= ITEM_BUFFER) {
        nearActor = true;
        break;
      }
    }
    if (nearActor) continue;
    used.add(key);
    trees.push({ cellX: x, cellZ: z });
  }
  return trees;
}

const SHARED_BOX = new THREE.BoxGeometry(1, 1, 1);
const textureLoader = new THREE.TextureLoader();
let trunkTex: THREE.Texture | null = null;
function loadTrunkTexture(): THREE.Texture {
  if (trunkTex) return trunkTex;
  trunkTex = textureLoader.load(dirtUrl);
  trunkTex.magFilter = THREE.NearestFilter;
  trunkTex.minFilter = THREE.NearestMipmapNearestFilter;
  trunkTex.colorSpace = THREE.SRGBColorSpace;
  trunkTex.wrapS = THREE.RepeatWrapping;
  trunkTex.wrapT = THREE.RepeatWrapping;
  return trunkTex;
}

// Builds two InstancedMeshes (trunk + canopy) using the same shared
// BoxGeometry the voxel renderer uses. Trees are rendered at voxel-cell
// coordinates so the caller can position the group with the same gridOffset
// as the voxel mesh and everything lines up.
export function buildFoliageMesh(trees: ReadonlyArray<TreePlacement>): THREE.Group {
  const group = new THREE.Group();
  group.name = "foliage";
  if (trees.length === 0) return group;

  const trunkTotal = trees.length * TRUNK_HEIGHT;
  const canopyTotal = trees.length * CANOPY_LAYERS * CANOPY_OFFSETS.length;

  const trunkMat = new THREE.MeshStandardMaterial({
    map: loadTrunkTexture(),
    roughness: 0.95,
  });
  // Darker leaf-green deliberately picked away from the Kenney grass texture's
  // dominant bin so foliage adds new pixel-content bins (visual gate uses bin
  // diversity as one of its health signals).
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0x2f6b22,
    roughness: 0.9,
  });

  const trunkMesh = new THREE.InstancedMesh(SHARED_BOX, trunkMat, trunkTotal);
  trunkMesh.name = "foliage:trunk";
  trunkMesh.castShadow = true;
  trunkMesh.receiveShadow = true;
  trunkMesh.count = trunkTotal;

  const canopyMesh = new THREE.InstancedMesh(SHARED_BOX, canopyMat, canopyTotal);
  canopyMesh.name = "foliage:canopy";
  canopyMesh.castShadow = true;
  canopyMesh.receiveShadow = true;
  canopyMesh.count = canopyTotal;

  const matrix = new THREE.Matrix4();
  let trunkCursor = 0;
  let canopyCursor = 0;

  for (const t of trees) {
    // Trunk: 4 cubes stacked above the y=0 grass voxel, world y centres at
    // 1.5, 2.5, 3.5, 4.5.
    for (let i = 0; i < TRUNK_HEIGHT; i++) {
      matrix.makeTranslation(t.cellX + 0.5, 1 + i + 0.5, t.cellZ + 0.5);
      trunkMesh.setMatrixAt(trunkCursor++, matrix);
    }
    // Canopy: 4 orthogonal cubes per layer over 2 layers at world y centres
    // 3.5 and 4.5 (the upper half of the trunk).
    for (let layer = 0; layer < CANOPY_LAYERS; layer++) {
      const wy = 3 + layer + 0.5;
      for (const [dx, dz] of CANOPY_OFFSETS) {
        matrix.makeTranslation(t.cellX + dx + 0.5, wy, t.cellZ + dz + 0.5);
        canopyMesh.setMatrixAt(canopyCursor++, matrix);
      }
    }
  }

  trunkMesh.instanceMatrix.needsUpdate = true;
  canopyMesh.instanceMatrix.needsUpdate = true;
  group.add(trunkMesh);
  group.add(canopyMesh);
  return group;
}
