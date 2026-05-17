import * as THREE from "three";

export interface Waypoint {
  cellX: number;
  cellZ: number;
  pauseSec: number;
}

export const NPC_WALK_SPEED = 0.4;
export const NPC_HALT_DISTANCE = 3;

type State = "pause" | "walk";

export class NpcWalker {
  private nextIdx = 1;
  private pauseTimer: number;
  private state: State = "pause";

  constructor(
    readonly mesh: THREE.Object3D,
    private readonly waypoints: Waypoint[],
    private readonly gridOffset: THREE.Vector3,
  ) {
    if (waypoints.length < 2) {
      throw new Error("NpcWalker requires at least 2 waypoints");
    }
    const start = waypoints[0];
    mesh.position.x = gridOffset.x + start.cellX + 0.5;
    mesh.position.z = gridOffset.z + start.cellZ + 0.5;
    this.pauseTimer = start.pauseSec;
  }

  update(dt: number, playerPos: THREE.Vector3): void {
    const dx = playerPos.x - this.mesh.position.x;
    const dz = playerPos.z - this.mesh.position.z;
    if (dx * dx + dz * dz < NPC_HALT_DISTANCE * NPC_HALT_DISTANCE) return;

    if (this.state === "pause") {
      this.pauseTimer -= dt;
      if (this.pauseTimer <= 0) this.state = "walk";
      return;
    }

    const target = this.waypoints[this.nextIdx];
    const tx = this.gridOffset.x + target.cellX + 0.5;
    const tz = this.gridOffset.z + target.cellZ + 0.5;
    const toX = tx - this.mesh.position.x;
    const toZ = tz - this.mesh.position.z;
    const dist = Math.hypot(toX, toZ);
    const step = NPC_WALK_SPEED * dt;

    if (dist === 0 || step >= dist) {
      this.mesh.position.x = tx;
      this.mesh.position.z = tz;
      this.nextIdx = (this.nextIdx + 1) % this.waypoints.length;
      this.state = "pause";
      this.pauseTimer = target.pauseSec;
      return;
    }

    this.mesh.position.x += (toX / dist) * step;
    this.mesh.position.z += (toZ / dist) * step;
  }
}
