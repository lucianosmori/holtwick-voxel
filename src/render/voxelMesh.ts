import * as THREE from "three";
import {
  VOXEL_DIRT,
  VOXEL_EMPTY,
  VOXEL_FLOOR,
  VOXEL_PLANKS,
  VOXEL_STONE,
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
  // VOXEL_STONE shares the wall stone texture — semantically a stone-floor
  // tile (no collision), visually the same Kenney slab.
  [VOXEL_STONE]: { textureUrl: stoneUrl, roughness: 0.9 },
};

// Kept for the VOXEL_WATER InstancedMesh path (per-instance Y bob via
// WaterAnimator is incompatible with the baked-AO BufferGeometry pipeline).
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

function buildMaterial(
  entry: VoxelPaletteEntry,
  withVertexColors: boolean,
): THREE.MeshStandardMaterial {
  const params: THREE.MeshStandardMaterialParameters = {
    roughness: entry.roughness ?? 1,
    metalness: entry.metalness ?? 0,
    vertexColors: withVertexColors,
  };
  if (entry.textureUrl) params.map = loadVoxelTexture(entry.textureUrl);
  if (entry.color !== undefined) params.color = entry.color;
  return new THREE.MeshStandardMaterial(params);
}

// ─── Per-face geometry data for AO bake ───────────────────────────────────
//
// Each face emits a CCW quad (viewed from +normal) so the standard back-face
// cull works without flipping `material.side`. Per-corner AO neighbours are
// expressed as offsets RELATIVE TO THE FACE-NEIGHBOUR CELL (the empty cell on
// the outside of the face). The three samples per corner are the two
// face-adjacent neighbours along the face's two perpendicular axes plus the
// one diagonal — exactly matches the plan's "2 face-adjacent + 1 diagonal"
// classic-Minecraft AO.
type Triplet = readonly [number, number, number];

interface AoNeighbors {
  readonly side1: Triplet;
  readonly side2: Triplet;
  readonly diag: Triplet;
}

interface FaceDef {
  readonly normal: Triplet;
  readonly corners: readonly [Triplet, Triplet, Triplet, Triplet];
  readonly ao: readonly [AoNeighbors, AoNeighbors, AoNeighbors, AoNeighbors];
}

const FACE_UVS: readonly [
  readonly [number, number],
  readonly [number, number],
  readonly [number, number],
  readonly [number, number],
] = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
];

const FACES: readonly FaceDef[] = [
  // +X
  {
    normal: [1, 0, 0],
    corners: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
    ],
    ao: [
      { side1: [0, -1, 0], side2: [0, 0, -1], diag: [0, -1, -1] },
      { side1: [0, 1, 0], side2: [0, 0, -1], diag: [0, 1, -1] },
      { side1: [0, 1, 0], side2: [0, 0, 1], diag: [0, 1, 1] },
      { side1: [0, -1, 0], side2: [0, 0, 1], diag: [0, -1, 1] },
    ],
  },
  // -X
  {
    normal: [-1, 0, 0],
    corners: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
    ao: [
      { side1: [0, -1, 0], side2: [0, 0, -1], diag: [0, -1, -1] },
      { side1: [0, -1, 0], side2: [0, 0, 1], diag: [0, -1, 1] },
      { side1: [0, 1, 0], side2: [0, 0, 1], diag: [0, 1, 1] },
      { side1: [0, 1, 0], side2: [0, 0, -1], diag: [0, 1, -1] },
    ],
  },
  // +Y
  {
    normal: [0, 1, 0],
    corners: [
      [0, 1, 0],
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
    ],
    ao: [
      { side1: [-1, 0, 0], side2: [0, 0, -1], diag: [-1, 0, -1] },
      { side1: [-1, 0, 0], side2: [0, 0, 1], diag: [-1, 0, 1] },
      { side1: [1, 0, 0], side2: [0, 0, 1], diag: [1, 0, 1] },
      { side1: [1, 0, 0], side2: [0, 0, -1], diag: [1, 0, -1] },
    ],
  },
  // -Y
  {
    normal: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    ao: [
      { side1: [-1, 0, 0], side2: [0, 0, -1], diag: [-1, 0, -1] },
      { side1: [1, 0, 0], side2: [0, 0, -1], diag: [1, 0, -1] },
      { side1: [1, 0, 0], side2: [0, 0, 1], diag: [1, 0, 1] },
      { side1: [-1, 0, 0], side2: [0, 0, 1], diag: [-1, 0, 1] },
    ],
  },
  // +Z
  {
    normal: [0, 0, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
    ao: [
      { side1: [-1, 0, 0], side2: [0, -1, 0], diag: [-1, -1, 0] },
      { side1: [1, 0, 0], side2: [0, -1, 0], diag: [1, -1, 0] },
      { side1: [1, 0, 0], side2: [0, 1, 0], diag: [1, 1, 0] },
      { side1: [-1, 0, 0], side2: [0, 1, 0], diag: [-1, 1, 0] },
    ],
  },
  // -Z
  {
    normal: [0, 0, -1],
    corners: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
    ao: [
      { side1: [1, 0, 0], side2: [0, -1, 0], diag: [1, -1, 0] },
      { side1: [-1, 0, 0], side2: [0, -1, 0], diag: [-1, -1, 0] },
      { side1: [-1, 0, 0], side2: [0, 1, 0], diag: [-1, 1, 0] },
      { side1: [1, 0, 0], side2: [0, 1, 0], diag: [1, 1, 0] },
    ],
  },
];

// Triangulation order for a CCW quad: (0,1,2) + (0,2,3) emits 6 vertices in a
// non-indexed BufferGeometry. Cheaper to build than indexed + identical at
// render time for this vertex count.
const TRI_INDEX_ORDER: readonly number[] = [0, 1, 2, 0, 2, 3];

const AO_DARKEN_PER_NEIGHBOR = 0.25;
const AO_MIN_SHADE = 0.5;

function isSolidForAo(grid: VoxelGrid, x: number, y: number, z: number): boolean {
  return grid.get(x, y, z) !== VOXEL_EMPTY;
}

// Face culling treats every non-empty cell as opaque — there are no
// transparent block types in this world, so any neighbour hides the face.
function isSolidForCull(grid: VoxelGrid, x: number, y: number, z: number): boolean {
  return grid.get(x, y, z) !== VOXEL_EMPTY;
}

function buildAoGeometry(grid: VoxelGrid, type: number): THREE.BufferGeometry | null {
  const { width, height, depth } = grid.dims;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        if (grid.get(x, y, z) !== type) continue;
        for (const face of FACES) {
          const fnx = x + face.normal[0];
          const fny = y + face.normal[1];
          const fnz = z + face.normal[2];
          if (isSolidForCull(grid, fnx, fny, fnz)) continue;

          // Per-corner AO shade — sample the 3 outside-of-face neighbours
          // that share the corner vertex with this face's quad.
          const shade: [number, number, number, number] = [1, 1, 1, 1];
          for (let i = 0; i < 4; i++) {
            const ao = face.ao[i];
            let count = 0;
            if (isSolidForAo(grid, fnx + ao.side1[0], fny + ao.side1[1], fnz + ao.side1[2])) count++;
            if (isSolidForAo(grid, fnx + ao.side2[0], fny + ao.side2[1], fnz + ao.side2[2])) count++;
            if (isSolidForAo(grid, fnx + ao.diag[0], fny + ao.diag[1], fnz + ao.diag[2])) count++;
            shade[i] = Math.max(AO_MIN_SHADE, 1 - AO_DARKEN_PER_NEIGHBOR * count);
          }

          for (const i of TRI_INDEX_ORDER) {
            const c = face.corners[i];
            positions.push(x + c[0], y + c[1], z + c[2]);
            normals.push(face.normal[0], face.normal[1], face.normal[2]);
            uvs.push(FACE_UVS[i][0], FACE_UVS[i][1]);
            const s = shade[i];
            colors.push(s, s, s);
          }
        }
      }
    }
  }

  if (positions.length === 0) return null;

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geom.computeBoundingSphere();
  return geom;
}

// Water keeps the InstancedMesh path so WaterAnimator (P8.4) can mutate
// per-instance Y values for the surface bob. AO bake is incompatible with
// per-frame position updates; documented divergence from the P9.2 spec's
// "single THREE.BufferGeometry per type" — water voxels live on top of grass
// and have no neighbouring corners that benefit visually from AO anyway.
function buildInstancedWaterMesh(
  grid: VoxelGrid,
  entry: VoxelPaletteEntry,
): THREE.InstancedMesh | null {
  const { width, height, depth } = grid.dims;
  let count = 0;
  for (let y = 0; y < height; y++) {
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        if (grid.get(x, y, z) === VOXEL_WATER) count++;
      }
    }
  }
  if (count === 0) return null;
  const material = buildMaterial(entry, false);
  const mesh = new THREE.InstancedMesh(SHARED_BOX, material, count);
  mesh.name = `voxel:${VOXEL_WATER}`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const matrix = new THREE.Matrix4();
  let cursor = 0;
  for (let y = 0; y < height; y++) {
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        if (grid.get(x, y, z) !== VOXEL_WATER) continue;
        matrix.makeTranslation(x + 0.5, y + 0.5, z + 0.5);
        mesh.setMatrixAt(cursor, matrix);
        cursor++;
      }
    }
  }
  mesh.count = cursor;
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

export function buildVoxelMesh(
  grid: VoxelGrid,
  palette: VoxelPalette = DEFAULT_VOXEL_PALETTE,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "voxelMesh";

  for (const [typeStr, entry] of Object.entries(palette)) {
    const type = Number(typeStr);
    if (type === VOXEL_WATER) {
      const water = buildInstancedWaterMesh(grid, entry);
      if (water) group.add(water);
      continue;
    }
    const geom = buildAoGeometry(grid, type);
    if (!geom) continue;
    const material = buildMaterial(entry, true);
    const mesh = new THREE.Mesh(geom, material);
    mesh.name = `voxel:${type}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  return group;
}
