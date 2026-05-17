import * as THREE from "three";
import { VOXEL_EMPTY, VOXEL_WALL, type VoxelGrid } from "../world/voxel";

export const PLAYER_SIZE = 0.6;
export const PLAYER_HALF = PLAYER_SIZE / 2;
export const PLAYER_SPEED = 6;
export const GROUND_FLOOR_Y = 1;
export const PLAYER_Y = GROUND_FLOOR_Y + PLAYER_HALF;
// Max one-block hop: hills (P9.3) raise the walking surface by exactly 1
// voxel; anything taller (tavern walls, market-stall posts) stays blocking.
const STEP_UP_MAX = 1;

export interface PlayerInput {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
}

export class Player {
  readonly mesh: THREE.Mesh;
  readonly input: PlayerInput = {
    forward: false,
    back: false,
    left: false,
    right: false,
  };
  private joystickVec: { x: number; z: number } | null = null;
  private readonly grid: VoxelGrid;
  private readonly gridOffset: THREE.Vector3;
  private detach: (() => void) | null = null;
  // Integer Y coord of the cell layer the player is standing in (= floor + 1).
  // Tracked across frames so step-up/down deltas can be capped at STEP_UP_MAX.
  private currentFloorY: number = GROUND_FLOOR_Y;

  constructor(grid: VoxelGrid, gridOffset: THREE.Vector3, color: number = 0xd97757) {
    this.grid = grid;
    this.gridOffset = gridOffset.clone();
    const geom = new THREE.BoxGeometry(PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.name = "player";
    this.mesh.position.set(0, PLAYER_Y, 0);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  attachKeyboard(target: Window = window): void {
    if (this.detach) return;
    const isEditableTarget = (t: EventTarget | null): boolean => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      return (
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.isContentEditable === true
      );
    };
    const onDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return; // Don't eat letters while typing.
      if (this.applyKey(e.code, true)) e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (this.applyKey(e.code, false)) e.preventDefault();
    };
    target.addEventListener("keydown", onDown);
    target.addEventListener("keyup", onUp);
    this.detach = () => {
      target.removeEventListener("keydown", onDown);
      target.removeEventListener("keyup", onUp);
    };
  }

  detachKeyboard(): void {
    this.detach?.();
    this.detach = null;
  }

  private applyKey(code: string, pressed: boolean): boolean {
    switch (code) {
      case "KeyW":
      case "ArrowUp":
        this.input.forward = pressed;
        return true;
      case "KeyS":
      case "ArrowDown":
        this.input.back = pressed;
        return true;
      case "KeyA":
      case "ArrowLeft":
        this.input.left = pressed;
        return true;
      case "KeyD":
      case "ArrowRight":
        this.input.right = pressed;
        return true;
      default:
        return false;
    }
  }

  // Touch joystick override. `jx`/`jy` are screen-space -1..1 (y positive
  // is down). Pass `null` to release the override and fall back to keyboard.
  // Small deadzone keeps a resting thumb from drifting the player.
  setJoystick(jx: number | null, jy?: number): void {
    if (jx === null || jy === undefined || (Math.abs(jx) < 0.15 && Math.abs(jy) < 0.15)) {
      this.joystickVec = null;
      return;
    }
    // Screen-y down -> world-z positive matches keyboard "back" semantics.
    this.joystickVec = { x: jx, z: jy };
  }

  update(dt: number): void {
    let dx = 0;
    let dz = 0;
    if (this.joystickVec) {
      dx = this.joystickVec.x;
      dz = this.joystickVec.z;
    } else {
      if (this.input.forward) dz -= 1;
      if (this.input.back) dz += 1;
      if (this.input.left) dx -= 1;
      if (this.input.right) dx += 1;
    }
    if (dx === 0 && dz === 0) return;
    const len = Math.hypot(dx, dz);
    const stepX = (dx / len) * PLAYER_SPEED * dt;
    const stepZ = (dz / len) * PLAYER_SPEED * dt;

    const pos = this.mesh.position;
    if (stepX !== 0) {
      const tryX = pos.x + stepX;
      const f = this.resolveFloor(tryX, pos.z, this.currentFloorY);
      if (f >= 0) {
        pos.x = tryX;
        this.currentFloorY = f;
        pos.y = f + PLAYER_HALF;
      }
    }
    if (stepZ !== 0) {
      const tryZ = pos.z + stepZ;
      const f = this.resolveFloor(pos.x, tryZ, this.currentFloorY);
      if (f >= 0) {
        pos.z = tryZ;
        this.currentFloorY = f;
        pos.y = f + PLAYER_HALF;
      }
    }
  }

  // Snap mesh.y to the floor under (x, z) without movement. Use after any
  // external position write (save restore, test movePlayerTo) so the camera
  // doesn't render the cube sunk into a hill until the next move tick.
  snapToFloor(): void {
    const f = this.resolveFloor(this.mesh.position.x, this.mesh.position.z, this.currentFloorY);
    const floor = f >= 0 ? f : GROUND_FLOOR_Y;
    this.currentFloorY = floor;
    this.mesh.position.y = floor + PLAYER_HALF;
  }

  get floorY(): number {
    return this.currentFloorY;
  }

  // Resolves the walking-surface Y at (worldX, worldZ) for the player footprint.
  // Returns the cell-layer Y the player would occupy (= top-of-surface), or -1
  // if the move is blocked. Step-up is capped at STEP_UP_MAX vs `fromFloor`;
  // step-down is unlimited (no gravity — player snaps to whatever's underneath).
  private resolveFloor(worldX: number, worldZ: number, fromFloor: number): number {
    const minX = worldX - PLAYER_HALF - this.gridOffset.x;
    const maxX = worldX + PLAYER_HALF - this.gridOffset.x;
    const minZ = worldZ - PLAYER_HALF - this.gridOffset.z;
    const maxZ = worldZ + PLAYER_HALF - this.gridOffset.z;
    const cellMinX = Math.floor(minX);
    const cellMaxX = Math.floor(maxX);
    const cellMinZ = Math.floor(minZ);
    const cellMaxZ = Math.floor(maxZ);
    // Scan range capped at fromFloor so overhead structures (canopies at y=3)
    // never inflate the surface height when the player walks under them.
    const scanMax = Math.min(this.grid.dims.height - 1, fromFloor);
    let topSolidY = 0;
    for (let cz = cellMinZ; cz <= cellMaxZ; cz++) {
      for (let cx = cellMinX; cx <= cellMaxX; cx++) {
        // Legacy VOXEL_WALL at y=0 stays blocking unconditionally (back-compat
        // with the early-iter starter-room walls).
        if (this.grid.get(cx, 0, cz) === VOXEL_WALL) return -1;
        for (let y = scanMax; y >= 1; y--) {
          if (this.grid.get(cx, y, cz) !== VOXEL_EMPTY) {
            if (y > topSolidY) topSolidY = y;
            break;
          }
        }
      }
    }
    const newFloor = topSolidY + 1;
    if (newFloor - fromFloor > STEP_UP_MAX) return -1;
    // Head clearance: the cell layer the player occupies at the new floor must
    // be empty across the entire footprint (catches walking into a wall stack
    // where y=1 is solid and y=2 is also solid — newFloor=2 but cell y=2 is
    // the wall itself, so blocked).
    for (let cz = cellMinZ; cz <= cellMaxZ; cz++) {
      for (let cx = cellMinX; cx <= cellMaxX; cx++) {
        if (this.grid.get(cx, newFloor, cz) !== VOXEL_EMPTY) return -1;
      }
    }
    return newFloor;
  }
}
