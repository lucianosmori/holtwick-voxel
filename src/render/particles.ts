import * as THREE from "three";

// P8.4 chimney smoke. 16 fade-up gray sprites recycled in a 4s lifecycle:
// each sprite drifts up + slightly outward, scales 0.5x → 1.5x, and fades
// opacity 0.7 → 0 over its lifetime. Initial spawn phases are staggered by
// i*(LIFETIME/COUNT) so the column reads as a continuous trail instead of
// 16 sprites pulsing in unison.

const SPRITE_COUNT = 16;
const LIFETIME = 4; // seconds
const RISE = 2.5; // world units traveled vertically over one lifetime
const DRIFT = 0.5; // world units of outward drift at end of life
const START_SCALE = 0.5;
const END_SCALE = 1.5;
const START_OPACITY = 0.7;

function buildSmokeTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    2,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, "rgba(200,200,200,1)");
  gradient.addColorStop(0.4, "rgba(170,170,170,0.7)");
  gradient.addColorStop(1, "rgba(120,120,120,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface SmokeSlot {
  readonly sprite: THREE.Sprite;
  readonly material: THREE.SpriteMaterial;
  readonly driftX: number;
  readonly driftZ: number;
  readonly phaseOffset: number;
}

export class SmokeEmitter {
  readonly group: THREE.Group;
  private readonly slots: SmokeSlot[];
  private readonly base: THREE.Vector3;

  constructor(basePosition: THREE.Vector3) {
    this.group = new THREE.Group();
    this.group.name = "chimneySmoke";
    this.base = basePosition.clone();
    this.slots = [];

    const texture = buildSmokeTexture();
    // Stagger initial ages so the column is already populated at t=0.
    for (let i = 0; i < SPRITE_COUNT; i++) {
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        opacity: START_OPACITY,
      });
      const sprite = new THREE.Sprite(material);
      sprite.position.copy(this.base);
      sprite.scale.set(START_SCALE, START_SCALE, 1);
      const angle = (i / SPRITE_COUNT) * Math.PI * 2;
      this.slots.push({
        sprite,
        material,
        driftX: Math.cos(angle) * DRIFT,
        driftZ: Math.sin(angle) * DRIFT,
        phaseOffset: (i / SPRITE_COUNT) * LIFETIME,
      });
      this.group.add(sprite);
    }
  }

  update(tSeconds: number): void {
    for (const slot of this.slots) {
      const age = ((tSeconds + slot.phaseOffset) % LIFETIME + LIFETIME) % LIFETIME;
      const f = age / LIFETIME;
      slot.sprite.position.set(
        this.base.x + slot.driftX * f,
        this.base.y + RISE * f,
        this.base.z + slot.driftZ * f,
      );
      const scale = START_SCALE + (END_SCALE - START_SCALE) * f;
      slot.sprite.scale.set(scale, scale, 1);
      slot.material.opacity = START_OPACITY * (1 - f);
    }
  }

  getSpritePositions(): Array<{ x: number; y: number; z: number; opacity: number }> {
    return this.slots.map((s) => ({
      x: s.sprite.position.x,
      y: s.sprite.position.y,
      z: s.sprite.position.z,
      opacity: s.material.opacity,
    }));
  }
}
