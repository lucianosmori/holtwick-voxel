import {
  VOXEL_PLANKS,
  VOXEL_STONE,
  VOXEL_WATER,
  VoxelGrid,
} from "./voxel";

// Tallest voxel any P7.1 structure stamps. Drives VILLAGE_HEIGHT so the grid
// can hold the market-stall canopy at y=3.
export const BUILDINGS_MAX_Y = 3;

export interface BlacksmithPlacement {
  readonly originX: number;
  readonly originZ: number;
  /** Cell in the east wall (x = originX + footprint - 1) left open as the doorway. */
  readonly doorwayZ: number;
}

export const BLACKSMITH_FOOTPRINT = 6;
export const BLACKSMITH_WALL_HEIGHT = 2;

export function addBlacksmith(grid: VoxelGrid, p: BlacksmithPlacement): void {
  const { originX, originZ, doorwayZ } = p;
  const maxX = originX + BLACKSMITH_FOOTPRINT;
  const maxZ = originZ + BLACKSMITH_FOOTPRINT;
  const eastX = maxX - 1;

  // Plank floor across the whole footprint so the forge interior reads as
  // wood, matching the tavern threshold treatment.
  for (let z = originZ; z < maxZ; z++) {
    for (let x = originX; x < maxX; x++) {
      if (grid.inBounds(x, 0, z)) grid.set(x, 0, z, VOXEL_PLANKS);
    }
  }

  // Wall ring at y = 1..BLACKSMITH_WALL_HEIGHT. East wall (x = eastX) has the
  // doorway at z = doorwayZ left open at every wall layer.
  for (let y = 1; y <= BLACKSMITH_WALL_HEIGHT; y++) {
    for (let z = originZ; z < maxZ; z++) {
      if (grid.inBounds(originX, y, z)) grid.set(originX, y, z, VOXEL_PLANKS);
      const isDoor = z === doorwayZ;
      if (!isDoor && grid.inBounds(eastX, y, z)) grid.set(eastX, y, z, VOXEL_PLANKS);
    }
    for (let x = originX + 1; x < eastX; x++) {
      if (grid.inBounds(x, y, originZ)) grid.set(x, y, originZ, VOXEL_PLANKS);
      if (grid.inBounds(x, y, maxZ - 1)) grid.set(x, y, maxZ - 1, VOXEL_PLANKS);
    }
  }

  // Stone anvil — single VOXEL_STONE at the interior centre, sitting on the
  // plank floor at y=1.
  const anvilX = Math.floor((originX + eastX) / 2);
  const anvilZ = Math.floor((originZ + maxZ - 1) / 2);
  if (grid.inBounds(anvilX, 1, anvilZ)) grid.set(anvilX, 1, anvilZ, VOXEL_STONE);
}

export interface WellPlacement {
  readonly centerX: number;
  readonly centerZ: number;
}

export const WELL_RADIUS = 2;

export function addWell(grid: VoxelGrid, p: WellPlacement): void {
  const { centerX, centerZ } = p;
  // Circular stone ring at y=1. A cell joins the ring when its distance from
  // the centre is within ±0.5 of WELL_RADIUS — produces ~12 stones around the
  // perimeter of a radius-2 disk.
  for (let dz = -WELL_RADIUS; dz <= WELL_RADIUS; dz++) {
    for (let dx = -WELL_RADIUS; dx <= WELL_RADIUS; dx++) {
      const d = Math.hypot(dx, dz);
      if (Math.abs(d - WELL_RADIUS) > 0.5) continue;
      const x = centerX + dx;
      const z = centerZ + dz;
      if (grid.inBounds(x, 1, z)) grid.set(x, 1, z, VOXEL_STONE);
    }
  }
  // Water in the centre hole at ground level so it reads as a deep pool
  // inside the ring.
  if (grid.inBounds(centerX, 0, centerZ)) grid.set(centerX, 0, centerZ, VOXEL_WATER);
}

export interface StallPlacement {
  readonly originX: number;
  readonly originZ: number;
}

export const STALL_WIDTH = 3;
export const STALL_DEPTH = 2;
export const STALL_POST_TOP = 2;
export const STALL_CANOPY_Y = 3;

export function addMarketStall(grid: VoxelGrid, p: StallPlacement): void {
  const { originX, originZ } = p;
  const cornerXs = [originX, originX + STALL_WIDTH - 1];
  const cornerZs = [originZ, originZ + STALL_DEPTH - 1];

  // 4 plank corner posts rising from y=1 to STALL_POST_TOP.
  for (const cx of cornerXs) {
    for (const cz of cornerZs) {
      for (let y = 1; y <= STALL_POST_TOP; y++) {
        if (grid.inBounds(cx, y, cz)) grid.set(cx, y, cz, VOXEL_PLANKS);
      }
    }
  }

  // Plank canopy across the full footprint at STALL_CANOPY_Y. Open-sided —
  // no walls between the posts.
  for (let z = originZ; z < originZ + STALL_DEPTH; z++) {
    for (let x = originX; x < originX + STALL_WIDTH; x++) {
      if (grid.inBounds(x, STALL_CANOPY_Y, z)) {
        grid.set(x, STALL_CANOPY_Y, z, VOXEL_PLANKS);
      }
    }
  }
}

export interface BuildingsLayout {
  readonly blacksmith: BlacksmithPlacement;
  readonly well: WellPlacement;
  readonly stalls: ReadonlyArray<StallPlacement>;
}

export const DEFAULT_BUILDINGS: BuildingsLayout = {
  blacksmith: { originX: 18, originZ: 20, doorwayZ: 22 },
  well: { centerX: 46, centerZ: 30 },
  stalls: [
    { originX: 20, originZ: 36 },
    { originX: 24, originZ: 36 },
  ],
};

export function addBuildings(grid: VoxelGrid, layout: BuildingsLayout = DEFAULT_BUILDINGS): void {
  addBlacksmith(grid, layout.blacksmith);
  addWell(grid, layout.well);
  for (const stall of layout.stalls) addMarketStall(grid, stall);
}
