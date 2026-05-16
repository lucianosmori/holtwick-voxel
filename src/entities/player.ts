import * as THREE from "three";
import { VOXEL_EMPTY, VOXEL_WALL, type VoxelGrid } from "../world/voxel";

export const PLAYER_SIZE = 0.6;
export const PLAYER_HALF = PLAYER_SIZE / 2;
export const PLAYER_SPEED = 6;
export const PLAYER_Y = 1 + PLAYER_HALF;

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
    const onDown = (e: KeyboardEvent) => {
      if (this.applyKey(e.code, true)) e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => {
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
      if (!this.hitsWall(tryX, pos.z)) pos.x = tryX;
    }
    if (stepZ !== 0) {
      const tryZ = pos.z + stepZ;
      if (!this.hitsWall(pos.x, tryZ)) pos.z = tryZ;
    }
  }

  private hitsWall(worldX: number, worldZ: number): boolean {
    const minX = worldX - PLAYER_HALF - this.gridOffset.x;
    const maxX = worldX + PLAYER_HALF - this.gridOffset.x;
    const minZ = worldZ - PLAYER_HALF - this.gridOffset.z;
    const maxZ = worldZ + PLAYER_HALF - this.gridOffset.z;
    const cellMinX = Math.floor(minX);
    const cellMaxX = Math.floor(maxX);
    const cellMinZ = Math.floor(minZ);
    const cellMaxZ = Math.floor(maxZ);
    const upperY = this.grid.dims.height;
    for (let cz = cellMinZ; cz <= cellMaxZ; cz++) {
      for (let cx = cellMinX; cx <= cellMaxX; cx++) {
        // Ground layer (y=0) is walkable terrain; legacy VOXEL_WALL stays
        // blocking for backward compatibility.
        if (this.grid.get(cx, 0, cz) === VOXEL_WALL) return true;
        // Any non-empty voxel above ground (tavern walls, future buildings)
        // blocks the player's torso AABB.
        for (let y = 1; y < upperY; y++) {
          if (this.grid.get(cx, y, cz) !== VOXEL_EMPTY) return true;
        }
      }
    }
    return false;
  }
}
