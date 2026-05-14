import { VOXEL_PLANKS, VoxelGrid } from "./voxel";

export const TAVERN_INTERIOR_WIDTH = 6;
export const TAVERN_INTERIOR_DEPTH = 4;
export const TAVERN_WALL_HEIGHT = 2;

export interface TavernPlacement {
  /** South-west corner of the outer footprint (interior + 1-cell wall ring). */
  readonly originX: number;
  readonly originZ: number;
  /** Cell in the south wall (z = originZ + footprintDepth-1) left open as the doorway. */
  readonly doorwayX: number;
}

export interface TavernLayout {
  readonly footprintWidth: number;
  readonly footprintDepth: number;
  readonly originX: number;
  readonly originZ: number;
  readonly doorwayX: number;
  readonly interiorMinX: number;
  readonly interiorMinZ: number;
  readonly interiorMaxX: number; // exclusive
  readonly interiorMaxZ: number; // exclusive
}

export function addTavern(grid: VoxelGrid, placement: TavernPlacement): TavernLayout {
  const footprintWidth = TAVERN_INTERIOR_WIDTH + 2;
  const footprintDepth = TAVERN_INTERIOR_DEPTH + 2;
  const { originX, originZ, doorwayX } = placement;
  const maxX = originX + footprintWidth; // exclusive
  const maxZ = originZ + footprintDepth; // exclusive
  const interiorMinX = originX + 1;
  const interiorMinZ = originZ + 1;
  const interiorMaxX = maxX - 1;
  const interiorMaxZ = maxZ - 1;
  const southZ = maxZ - 1;

  if (grid.dims.height < TAVERN_WALL_HEIGHT + 1) {
    throw new Error(
      `addTavern: grid height ${grid.dims.height} cannot hold ${TAVERN_WALL_HEIGHT}-tall walls`,
    );
  }

  // Plank floor across the whole footprint so the doorway threshold reads as
  // wood, not grass-cut.
  for (let z = originZ; z < maxZ; z++) {
    for (let x = originX; x < maxX; x++) {
      if (!grid.inBounds(x, 0, z)) continue;
      grid.set(x, 0, z, VOXEL_PLANKS);
    }
  }

  // Wall ring at y = 1..TAVERN_WALL_HEIGHT. Doorway leaves one south-wall cell
  // open at every wall layer so the player can walk straight through.
  for (let y = 1; y <= TAVERN_WALL_HEIGHT; y++) {
    for (let x = originX; x < maxX; x++) {
      const isDoor = x === doorwayX;
      if (grid.inBounds(x, y, originZ)) grid.set(x, y, originZ, VOXEL_PLANKS);
      if (!isDoor && grid.inBounds(x, y, southZ)) grid.set(x, y, southZ, VOXEL_PLANKS);
    }
    for (let z = originZ + 1; z < southZ; z++) {
      if (grid.inBounds(originX, y, z)) grid.set(originX, y, z, VOXEL_PLANKS);
      if (grid.inBounds(maxX - 1, y, z)) grid.set(maxX - 1, y, z, VOXEL_PLANKS);
    }
  }

  return {
    footprintWidth,
    footprintDepth,
    originX,
    originZ,
    doorwayX,
    interiorMinX,
    interiorMinZ,
    interiorMaxX,
    interiorMaxZ,
  };
}
