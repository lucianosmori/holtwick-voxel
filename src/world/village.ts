import {
  VOXEL_DIRT,
  VOXEL_FLOOR,
  VOXEL_STONE,
  VOXEL_WATER,
  VoxelGrid,
} from "./voxel";

export const VILLAGE_WIDTH = 64;
export const VILLAGE_DEPTH = 64;
export const VILLAGE_HEIGHT = 1;

const PLAZA_HALF = 10;
const PATH_HALF = 3;
const POND_CX = 12;
const POND_CZ = 50;
const POND_RADIUS = 8;
const SCATTER_PATCHES = 6;
const SCATTER_RADIUS_MIN = 2;
const SCATTER_RADIUS_MAX = 4;

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

export function buildVillage(seed: number = 1): VoxelGrid {
  const grid = new VoxelGrid(VILLAGE_WIDTH, VILLAGE_HEIGHT, VILLAGE_DEPTH, VOXEL_FLOOR);
  const rand = mulberry32(seed);
  const cx = Math.floor(VILLAGE_WIDTH / 2);
  const cz = Math.floor(VILLAGE_DEPTH / 2);

  const inPlaza = (x: number, z: number): boolean =>
    x >= cx - PLAZA_HALF &&
    x < cx + PLAZA_HALF &&
    z >= cz - PLAZA_HALF &&
    z < cz + PLAZA_HALF;

  // N/S and E/W dirt roads through the village; skip plaza interior so the
  // plaza tile reads as one solid slab.
  for (let z = 0; z < VILLAGE_DEPTH; z++) {
    for (let x = cx - PATH_HALF; x <= cx + PATH_HALF; x++) {
      if (inPlaza(x, z)) continue;
      grid.set(x, 0, z, VOXEL_DIRT);
    }
  }
  for (let x = 0; x < VILLAGE_WIDTH; x++) {
    for (let z = cz - PATH_HALF; z <= cz + PATH_HALF; z++) {
      if (inPlaza(x, z)) continue;
      grid.set(x, 0, z, VOXEL_DIRT);
    }
  }

  // 2-deep dirt ring framing the plaza, like a worn footpath around stone.
  for (let d = 1; d <= 2; d++) {
    const xMin = cx - PLAZA_HALF - d;
    const xMax = cx + PLAZA_HALF + d - 1;
    const zMin = cz - PLAZA_HALF - d;
    const zMax = cz + PLAZA_HALF + d - 1;
    for (let x = xMin; x <= xMax; x++) {
      if (grid.inBounds(x, 0, zMin)) grid.set(x, 0, zMin, VOXEL_DIRT);
      if (grid.inBounds(x, 0, zMax)) grid.set(x, 0, zMax, VOXEL_DIRT);
    }
    for (let z = zMin; z <= zMax; z++) {
      if (grid.inBounds(xMin, 0, z)) grid.set(xMin, 0, z, VOXEL_DIRT);
      if (grid.inBounds(xMax, 0, z)) grid.set(xMax, 0, z, VOXEL_DIRT);
    }
  }

  // Scattered dirt patches (worn ground around the village) — deterministic
  // via seeded RNG, kept clear of the plaza so they read as outskirts.
  for (let i = 0; i < SCATTER_PATCHES; i++) {
    const px = Math.floor(rand() * VILLAGE_WIDTH);
    const pz = Math.floor(rand() * VILLAGE_DEPTH);
    if (inPlaza(px, pz)) continue;
    const r = SCATTER_RADIUS_MIN + Math.floor(rand() * (SCATTER_RADIUS_MAX - SCATTER_RADIUS_MIN + 1));
    for (let z = pz - r; z <= pz + r; z++) {
      for (let x = px - r; x <= px + r; x++) {
        if (!grid.inBounds(x, 0, z)) continue;
        if (inPlaza(x, z)) continue;
        const dx = x - px;
        const dz = z - pz;
        if (dx * dx + dz * dz <= r * r) grid.set(x, 0, z, VOXEL_DIRT);
      }
    }
  }

  // Central stone plaza — overwrites paths/ring at the seam so the plaza
  // surface stays uniform.
  for (let z = cz - PLAZA_HALF; z < cz + PLAZA_HALF; z++) {
    for (let x = cx - PLAZA_HALF; x < cx + PLAZA_HALF; x++) {
      grid.set(x, 0, z, VOXEL_STONE);
    }
  }

  // Water pond — circular blob with jittered edge, only overwrites grass so
  // it doesn't eat a road or the plaza.
  for (let z = POND_CZ - POND_RADIUS - 1; z <= POND_CZ + POND_RADIUS + 1; z++) {
    for (let x = POND_CX - POND_RADIUS - 1; x <= POND_CX + POND_RADIUS + 1; x++) {
      if (!grid.inBounds(x, 0, z)) continue;
      const dx = x - POND_CX;
      const dz = z - POND_CZ;
      const dist = Math.hypot(dx, dz) + (rand() - 0.5) * 1.2;
      if (dist >= POND_RADIUS) continue;
      if (grid.get(x, 0, z) !== VOXEL_FLOOR) continue;
      grid.set(x, 0, z, VOXEL_WATER);
    }
  }

  return grid;
}
