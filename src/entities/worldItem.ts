// 3D pickup item: a small emissive cube that hover-bobs above the ground.
// Lifetime managed by main.ts — once `picked` flips true, the mesh is
// removed from its parent and its geometry/material disposed.

import * as THREE from "three";
import type { ItemDef } from "../data/item.schema";

export const ITEM_SIZE = 0.3;
export const ITEM_HALF = ITEM_SIZE / 2;
// Float ~0.25 above the floor surface (floor cells occupy y=0..1).
export const ITEM_BASE_Y = 1 + ITEM_HALF + 0.25;
// Pickup is a 2D distance check on XZ — items hover above the player, so a
// 3D distance would never trigger.
export const PICKUP_RADIUS = 0.55;

export class WorldItem {
  readonly mesh: THREE.Mesh;
  readonly itemId: string;
  picked = false;
  readonly baseY: number;
  private readonly phase: number;

  constructor(def: ItemDef, worldPos: THREE.Vector3) {
    const geom = new THREE.BoxGeometry(ITEM_SIZE, ITEM_SIZE, ITEM_SIZE);
    const mat = new THREE.MeshStandardMaterial({
      color: def.color,
      emissive: def.color,
      emissiveIntensity: 0.35,
      roughness: 0.4,
      metalness: def.id === "gold_coin" ? 0.7 : 0.1,
    });
    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.name = `item:${def.id}`;
    this.mesh.position.copy(worldPos);
    this.mesh.castShadow = true;
    this.itemId = def.id;
    this.baseY = worldPos.y;
    // Deterministic phase from cell coords keeps the bob stable across
    // reloads without needing extra rng plumbing.
    this.phase = (Math.abs(Math.sin(worldPos.x * 12.9898 + worldPos.z * 78.233)) % 1) * Math.PI * 2;
  }

  update(t: number): void {
    this.mesh.position.y = this.baseY + Math.sin(t * 2 + this.phase) * 0.1;
    this.mesh.rotation.y = t * 0.8 + this.phase;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
