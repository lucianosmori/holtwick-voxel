import * as THREE from "three";
import { VOXEL_WATER } from "./voxel";

const tmpMatrix = new THREE.Matrix4();
const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3();

const WATER_AMPLITUDE = 0.05;
const WATER_FREQ = 1.5;
const WATER_PHASE_STEP = 0.3;

export class WaterAnimator {
  private readonly mesh: THREE.InstancedMesh | null;
  private readonly baseY: Float32Array;
  private readonly count: number;

  constructor(voxelGroup: THREE.Group) {
    const mesh = voxelGroup.getObjectByName(`voxel:${VOXEL_WATER}`);
    if (!mesh || !(mesh instanceof THREE.InstancedMesh)) {
      this.mesh = null;
      this.baseY = new Float32Array(0);
      this.count = 0;
      return;
    }
    this.mesh = mesh;
    this.count = mesh.count;
    this.baseY = new Float32Array(this.count);
    for (let i = 0; i < this.count; i++) {
      mesh.getMatrixAt(i, tmpMatrix);
      tmpMatrix.decompose(tmpPos, tmpQuat, tmpScale);
      this.baseY[i] = tmpPos.y;
    }
  }

  update(t: number): void {
    if (!this.mesh || this.count === 0) return;
    for (let i = 0; i < this.count; i++) {
      this.mesh.getMatrixAt(i, tmpMatrix);
      tmpMatrix.decompose(tmpPos, tmpQuat, tmpScale);
      tmpPos.y = this.baseY[i] + Math.sin((t + i * WATER_PHASE_STEP) * WATER_FREQ) * WATER_AMPLITUDE;
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
      this.mesh.setMatrixAt(i, tmpMatrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  getInstanceYs(): number[] {
    if (!this.mesh || this.count === 0) return [];
    const out: number[] = [];
    for (let i = 0; i < this.count; i++) {
      this.mesh.getMatrixAt(i, tmpMatrix);
      tmpMatrix.decompose(tmpPos, tmpQuat, tmpScale);
      out.push(tmpPos.y);
    }
    return out;
  }
}
