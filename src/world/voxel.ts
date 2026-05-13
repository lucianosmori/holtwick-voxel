export const VOXEL_EMPTY = 0 as const;
export const VOXEL_FLOOR = 1 as const;
export const VOXEL_WALL = 2 as const;

export type VoxelType =
  | typeof VOXEL_EMPTY
  | typeof VOXEL_FLOOR
  | typeof VOXEL_WALL;

export interface VoxelDims {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
}

export class VoxelGrid {
  readonly dims: VoxelDims;
  readonly data: Uint8Array;

  constructor(width: number, height: number, depth: number, fill: number = VOXEL_EMPTY) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || !Number.isInteger(depth)) {
      throw new Error("VoxelGrid: dims must be integers");
    }
    if (width <= 0 || height <= 0 || depth <= 0) {
      throw new Error("VoxelGrid: dims must be positive");
    }
    this.dims = { width, height, depth };
    this.data = new Uint8Array(width * height * depth);
    if (fill !== 0) this.data.fill(fill);
  }

  inBounds(x: number, y: number, z: number): boolean {
    const { width, height, depth } = this.dims;
    return x >= 0 && y >= 0 && z >= 0 && x < width && y < height && z < depth;
  }

  private index(x: number, y: number, z: number): number {
    const { width, depth } = this.dims;
    return x + width * (z + depth * y);
  }

  get(x: number, y: number, z: number): number {
    if (!this.inBounds(x, y, z)) return VOXEL_EMPTY;
    return this.data[this.index(x, y, z)];
  }

  set(x: number, y: number, z: number, v: number): void {
    if (!this.inBounds(x, y, z)) {
      throw new RangeError(
        `VoxelGrid.set: (${x},${y},${z}) out of bounds for ${this.dims.width}x${this.dims.height}x${this.dims.depth}`,
      );
    }
    this.data[this.index(x, y, z)] = v;
  }
}
