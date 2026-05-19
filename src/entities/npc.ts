import * as THREE from "three";

import type { NpcDef } from "../data/npc.schema";
import { paletteFor } from "../render/proceduralSprite";
import { buildCharacterMesh, type CharacterMesh, type CharacterPalette } from "../render/characterMesh";

export const NPC_WIDTH = 1;
export const NPC_HEIGHT = 1.5;
// NPC group is foot-anchored at y=0; place its origin so feet sit on the
// ground plane (y=1, matching the old NPC_Y - NPC_HEIGHT/2 floor).
export const NPC_Y = 1;

export interface BillboardNpcOptions {
  label: string;
  position: THREE.Vector3;
  background?: string;
  foreground?: string;
  /**
   * Optional NpcDef. When supplied the character mesh palette is derived
   * deterministically from the def's id+role. Without a def we fall back
   * to a neutral palette using the background/foreground colors.
   */
  def?: NpcDef;
}

function defaultPalette(background?: string, foreground?: string): CharacterPalette {
  return {
    skin: "#f4c8a8",
    hair: "#3d2418",
    body: background ?? "#d97757",
    bodyAccent: "#3a2a1a",
    trim: foreground ?? "#d4a544",
    eyes: "#1a1a1a",
  };
}

export class BillboardNpc {
  // Group-rooted multi-part character (head/torso/limbs). Name retained as
  // "BillboardNpc" for blast-radius reasons — external code already references
  // it; the visual is no longer a billboard plane.
  readonly mesh: THREE.Group;
  private readonly character: CharacterMesh;
  private readonly lookTarget = new THREE.Vector3();
  private prevX: number;
  private prevZ: number;

  constructor(options: BillboardNpcOptions) {
    let palette: CharacterPalette;
    if (options.def) {
      const p = paletteFor(options.def).palette;
      palette = {
        skin: p.skin,
        hair: p.hair,
        body: p.body,
        bodyAccent: p.bodyAccent,
        trim: p.trim,
        eyes: p.eyes,
      };
    } else {
      palette = defaultPalette(options.background, options.foreground);
    }
    this.character = buildCharacterMesh(palette);
    this.mesh = new THREE.Group();
    this.mesh.name = `npc:${options.label}`;
    this.mesh.add(this.character.group);
    this.mesh.position.copy(options.position);
    this.prevX = options.position.x;
    this.prevZ = options.position.z;
  }

  // Per-frame animation. If the NPC has moved since last call we treat it as
  // walking — drives the limb swing — and yaw to face the direction of travel.
  // Otherwise we ease the swing back to rest and leave facing to faceCamera.
  animate(dt: number): boolean {
    const dx = this.mesh.position.x - this.prevX;
    const dz = this.mesh.position.z - this.prevZ;
    const moving = (dx * dx + dz * dz) > 1e-7;
    if (moving) {
      const yaw = Math.atan2(dx, dz);
      this.character.group.rotation.y = yaw + Math.PI;
    }
    this.character.animate(dt, moving);
    this.prevX = this.mesh.position.x;
    this.prevZ = this.mesh.position.z;
    return moving;
  }

  // Idle NPCs face the camera (yaw only) so the player always sees their face.
  // Walkers override this in animate() via travel-direction yaw.
  faceCamera(camera: THREE.Camera): void {
    this.lookTarget.copy(camera.position);
    this.lookTarget.y = this.mesh.position.y;
    this.character.group.lookAt(this.lookTarget);
    // lookAt aligns -z with target; characters were built facing -z, so this
    // is correct without extra offset. Keep rotation x/z zero (no tilt).
    this.character.group.rotation.x = 0;
    this.character.group.rotation.z = 0;
  }
}
