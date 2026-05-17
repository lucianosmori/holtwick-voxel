import {
  VOXEL_DIRT,
  VOXEL_EMPTY,
  VOXEL_FLOOR,
  VOXEL_STONE,
  VOXEL_WATER,
  VoxelGrid,
} from "./voxel";
import { addTavern, TAVERN_WALL_HEIGHT } from "./tavern";
import { addBuildings, BUILDINGS_MAX_Y } from "./buildings";
import { ITEMS, SEEDED_ITEM_IDS, SEEDED_PER_TYPE } from "../data/items";

export const VILLAGE_WIDTH = 64;
export const VILLAGE_DEPTH = 64;
// Ground tiles live at y=0; building voxels stack above. Height sized to the
// tallest stamp — tavern walls (TAVERN_WALL_HEIGHT) or P7.1 market-stall
// canopy at y=BUILDINGS_MAX_Y, whichever is higher.
export const VILLAGE_HEIGHT = 1 + Math.max(TAVERN_WALL_HEIGHT, BUILDINGS_MAX_Y);

export const TAVERN_ORIGIN_X = 28;
export const TAVERN_ORIGIN_Z = 14;
export const TAVERN_DOORWAY_X = 32;

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
  const grid = new VoxelGrid(VILLAGE_WIDTH, VILLAGE_HEIGHT, VILLAGE_DEPTH);
  // VoxelGrid constructor only fills one value across the whole volume; we
  // only want VOXEL_FLOOR on the ground plane (y=0), wall layers stay empty.
  for (let z = 0; z < VILLAGE_DEPTH; z++) {
    for (let x = 0; x < VILLAGE_WIDTH; x++) {
      grid.set(x, 0, z, VOXEL_FLOOR);
    }
  }
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

  // Tavern stamped last so it overwrites whatever ground tiles (grass + the
  // N/S dirt road that runs through cx=32) are under its footprint with a
  // continuous plank floor + wall ring.
  addTavern(grid, {
    originX: TAVERN_ORIGIN_X,
    originZ: TAVERN_ORIGIN_Z,
    doorwayX: TAVERN_DOORWAY_X,
  });

  // P7.1 — blacksmith forge, village well, 2 market stalls. Stamped after the
  // tavern so any overlap with the plaza/road tiles gets overwritten by the
  // building voxels.
  addBuildings(grid);

  return grid;
}

export interface ItemSpawn {
  item_id: string;
  cellX: number;
  cellZ: number;
}

// P8.6 — 12 random slots + (SEEDED_ITEM_IDS.length * SEEDED_PER_TYPE) guaranteed
// slots for the new item types (bread/apple/wooden_sword/wooden_shield).
export const ITEM_SPAWN_COUNT = 12 + SEEDED_ITEM_IDS.length * SEEDED_PER_TYPE;

// Deterministic item placement: walks a separate mulberry32 stream (seed XOR
// magic) so adding/removing items doesn't shift voxel layout. Skips water,
// walls, the central plaza band (keeps player-spawn area uncluttered), and
// any cell within 1 voxel of an NPC. Falls back early if 500 attempts can't
// fill the quota — keeps boot fast on a pathological seed.
export function computeItemSpawns(
  seed: number,
  grid: VoxelGrid,
  npcCells: ReadonlyArray<{ cellX: number; cellZ: number }>,
  count: number = ITEM_SPAWN_COUNT,
): ItemSpawn[] {
  const rand = mulberry32((seed ^ 0xa17e) >>> 0);
  const cx = Math.floor(VILLAGE_WIDTH / 2);
  const cz = Math.floor(VILLAGE_DEPTH / 2);
  const PLAZA_INNER_HALF = 4; // keep an 8×8 buffer around player spawn clear

  const isReserved = (x: number, z: number): boolean => {
    if (Math.abs(x - cx) <= PLAZA_INNER_HALF && Math.abs(z - cz) <= PLAZA_INNER_HALF) return true;
    for (const n of npcCells) {
      if (Math.abs(x - n.cellX) <= 1 && Math.abs(z - n.cellZ) <= 1) return true;
    }
    return false;
  };

  const isWalkable = (x: number, z: number): boolean => {
    if (!grid.inBounds(x, 0, z)) return false;
    const ground = grid.get(x, 0, z);
    if (ground === VOXEL_EMPTY || ground === VOXEL_WATER) return false;
    for (let y = 1; y < grid.dims.height; y++) {
      if (grid.get(x, y, z) !== VOXEL_EMPTY) return false;
    }
    return true;
  };

  const spawns: ItemSpawn[] = [];
  const used = new Set<string>();
  const MAX_ATTEMPTS = 1000;

  // P8.6 — front-load with SEEDED_PER_TYPE of each guaranteed item type so the
  // new corpus is always visible in the world. These occupy the first slots of
  // the array, so the remaining `count - seededTotal` get random selections.
  const tryPlace = (itemId: string): boolean => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const x = Math.floor(rand() * VILLAGE_WIDTH);
      const z = Math.floor(rand() * VILLAGE_DEPTH);
      const key = `${x},${z}`;
      if (used.has(key)) continue;
      if (!isWalkable(x, z)) continue;
      if (isReserved(x, z)) continue;
      used.add(key);
      spawns.push({ item_id: itemId, cellX: x, cellZ: z });
      return true;
    }
    return false;
  };

  for (const itemId of SEEDED_ITEM_IDS) {
    for (let k = 0; k < SEEDED_PER_TYPE; k++) {
      if (spawns.length >= count) break;
      tryPlace(itemId);
    }
  }

  let attempts = 0;
  while (spawns.length < count && attempts < MAX_ATTEMPTS) {
    attempts++;
    const x = Math.floor(rand() * VILLAGE_WIDTH);
    const z = Math.floor(rand() * VILLAGE_DEPTH);
    const key = `${x},${z}`;
    if (used.has(key)) continue;
    if (!isWalkable(x, z)) continue;
    if (isReserved(x, z)) continue;
    used.add(key);
    const def = ITEMS[Math.floor(rand() * ITEMS.length)];
    spawns.push({ item_id: def.id, cellX: x, cellZ: z });
  }
  return spawns;
}
