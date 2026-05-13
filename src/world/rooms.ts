import { VOXEL_FLOOR, VOXEL_WALL, VoxelGrid } from "./voxel";

export const STARTER_ROOM_WIDTH = 32;
export const STARTER_ROOM_DEPTH = 32;
export const STARTER_ROOM_HEIGHT = 1;

export function buildStarterRoom(): VoxelGrid {
  const grid = new VoxelGrid(
    STARTER_ROOM_WIDTH,
    STARTER_ROOM_HEIGHT,
    STARTER_ROOM_DEPTH,
    VOXEL_FLOOR,
  );
  const xMax = STARTER_ROOM_WIDTH - 1;
  const zMax = STARTER_ROOM_DEPTH - 1;
  for (let x = 0; x < STARTER_ROOM_WIDTH; x++) {
    grid.set(x, 0, 0, VOXEL_WALL);
    grid.set(x, 0, zMax, VOXEL_WALL);
  }
  for (let z = 0; z < STARTER_ROOM_DEPTH; z++) {
    grid.set(0, 0, z, VOXEL_WALL);
    grid.set(xMax, 0, z, VOXEL_WALL);
  }
  return grid;
}
