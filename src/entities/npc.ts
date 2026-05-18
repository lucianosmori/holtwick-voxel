import * as THREE from "three";

import type { NpcDef } from "../data/npc.schema";
import { makeProceduralNpcTexture } from "../render/proceduralSprite";

export const NPC_WIDTH = 1;
export const NPC_HEIGHT = 1.5;
export const NPC_Y = 1 + NPC_HEIGHT / 2;

export interface PlaceholderTextureOptions {
  label: string;
  background?: string;
  foreground?: string;
  size?: number;
}

export function makePlaceholderNpcTexture(
  options: PlaceholderTextureOptions,
): THREE.CanvasTexture {
  const size = options.size ?? 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = Math.round(size * (NPC_HEIGHT / NPC_WIDTH));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("makePlaceholderNpcTexture: 2d context unavailable");

  const bg = options.background ?? "#d97757";
  const fg = options.foreground ?? "#ffffff";
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = fg;
  ctx.font = `bold ${Math.floor(size * 0.18)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(options.label, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface BillboardNpcOptions {
  label: string;
  position: THREE.Vector3;
  background?: string;
  foreground?: string;
  /**
   * Optional NpcDef. When supplied, the billboard renders a procedural
   * pixel-art sprite derived deterministically from the def's id+role
   * instead of the flat-rectangle placeholder texture.
   */
  def?: NpcDef;
}

export class BillboardNpc {
  readonly mesh: THREE.Mesh;
  readonly texture: THREE.CanvasTexture;
  private readonly lookTarget = new THREE.Vector3();

  constructor(options: BillboardNpcOptions) {
    if (options.def) {
      this.texture = makeProceduralNpcTexture(options.def).texture;
    } else {
      this.texture = makePlaceholderNpcTexture({
        label: options.label,
        background: options.background,
        foreground: options.foreground,
      });
    }
    const geometry = new THREE.PlaneGeometry(NPC_WIDTH, NPC_HEIGHT);
    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = `npc:${options.label}`;
    this.mesh.position.copy(options.position);
  }

  faceCamera(camera: THREE.Camera): void {
    this.lookTarget.copy(camera.position);
    this.lookTarget.y = this.mesh.position.y;
    this.mesh.lookAt(this.lookTarget);
  }
}
