import * as THREE from "three";

import type { NpcDef } from "../data/npc.schema";

// Pixel-art sprite grid. Scaled up by PIXEL_SCALE for a crisp 128x192 texture
// that matches the 1:1.5 billboard plane (NPC_WIDTH x NPC_HEIGHT in npc.ts).
const SPRITE_W = 32;
const SPRITE_H = 48;
const PIXEL_SCALE = 4;

export interface SpritePalette {
  skin: string;
  hair: string;
  body: string;
  bodyAccent: string;
  trim: string;
  eyes: string;
  outline: string;
}

export type SpriteArchetype = "robe" | "armor" | "tunic" | "undead" | "creature";

const SKIN_TONES = ["#f4c8a8", "#e3b189", "#c89570", "#a8744a", "#7a5538"] as const;
const HAIR_COLORS = ["#1a1a1a", "#3d2418", "#7a4628", "#a8693c", "#d4a544", "#c0c0c0", "#5a3a6e"] as const;
const ROBE_COLORS = ["#3a2a6e", "#5a1f3a", "#2a4a3a", "#1a3a5a", "#4a2a1a"] as const;
const ARMOR_COLORS = ["#7a8088", "#5e636a", "#8a6a4a"] as const;
const TUNIC_COLORS = ["#7a4a2a", "#5a3a6e", "#3a5a7a", "#2a5a3a", "#5a2a2a"] as const;
const TRIM_COLORS = ["#d4a544", "#c84444", "#4488c8", "#a87a3a", "#6ec888"] as const;
const CREATURE_COLORS = ["#4a8a3a", "#8e4a8a", "#6a4a3a", "#3a5a8a", "#8a3a3a"] as const;

// FNV-1a — deterministic, no deps, fine for palette routing.
function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length];
}

function shade(hex: string, by: number): string {
  // by > 0 darkens, by < 0 lightens
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = (n: number) => {
    const v = by >= 0 ? n * (1 - by) : n + (255 - n) * -by;
    return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  };
  return `#${f(r)}${f(g)}${f(b)}`;
}

function archetypeFor(role: string): SpriteArchetype {
  const r = role.toLowerCase();
  if (/mage|archmage|cultist|acolyte|wisp|lich|pilgrim|sorcer|warlock/.test(r)) return "robe";
  if (/knight|warden|guard|paladin|boss/.test(r)) return "armor";
  if (/ghoul|zombie|skeleton|undead|bone|wraith/.test(r)) return "undead";
  if (/slime|spider|bat|hound|demon|fungal|beast|critter|kobold/.test(r)) return "creature";
  return "tunic";
}

export function paletteFor(def: NpcDef): { palette: SpritePalette; archetype: SpriteArchetype } {
  const h1 = hash(def.id);
  const h2 = hash(def.id + "::" + def.role);
  const archetype = archetypeFor(def.role);

  const skin = archetype === "undead" ? "#c8c8b8" : pick(SKIN_TONES, h1);
  const hair = pick(HAIR_COLORS, h2 >>> 3);
  const body =
    archetype === "robe" ? pick(ROBE_COLORS, h2) :
    archetype === "armor" ? pick(ARMOR_COLORS, h2) :
    archetype === "undead" ? "#3a2a3a" :
    archetype === "creature" ? pick(CREATURE_COLORS, h2) :
    pick(TUNIC_COLORS, h2);
  const bodyAccent = shade(body, 0.3);
  const trim = pick(TRIM_COLORS, h1 >>> 5);
  const eyes = archetype === "undead" || archetype === "creature" ? "#d83a1a" : "#1a1a1a";
  const outline = shade(body, 0.6);

  return {
    palette: { skin, hair, body, bodyAccent, trim, eyes, outline },
    archetype,
  };
}

function block(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x * PIXEL_SCALE, y * PIXEL_SCALE, w * PIXEL_SCALE, h * PIXEL_SCALE);
}

function drawHead(ctx: CanvasRenderingContext2D, p: SpritePalette, hooded: boolean): void {
  if (hooded) {
    // Hood drape covers most of head, leaving face shadow
    block(ctx, 10, 3, 12, 11, p.body);
    block(ctx, 12, 8, 8, 5, shade(p.skin, 0.5)); // shadowed face
    block(ctx, 13, 10, 2, 1, p.eyes);
    block(ctx, 17, 10, 2, 1, p.eyes);
    return;
  }
  // Head proper
  block(ctx, 11, 4, 10, 10, p.skin);
  // Hair cap on top + sideburns
  block(ctx, 10, 3, 12, 4, p.hair);
  block(ctx, 10, 7, 1, 3, p.hair);
  block(ctx, 21, 7, 1, 3, p.hair);
  // Eyes
  block(ctx, 13, 9, 2, 2, p.eyes);
  block(ctx, 17, 9, 2, 2, p.eyes);
  // Mouth
  block(ctx, 14, 12, 4, 1, shade(p.skin, 0.4));
}

function drawRobe(ctx: CanvasRenderingContext2D, p: SpritePalette): void {
  drawHead(ctx, p, true);
  // Robe trapezoid widening toward the hem
  block(ctx, 9, 14, 14, 16, p.body);
  block(ctx, 7, 22, 18, 14, p.body);
  block(ctx, 5, 36, 22, 8, p.body);
  // Hem trim band
  block(ctx, 5, 44, 22, 2, p.trim);
  // Centre placket
  block(ctx, 15, 14, 2, 24, p.bodyAccent);
  // Sleeves
  block(ctx, 6, 16, 3, 12, p.body);
  block(ctx, 23, 16, 3, 12, p.body);
  // Hands clutching staff
  block(ctx, 6, 28, 3, 2, p.skin);
  block(ctx, 23, 28, 3, 2, p.skin);
}

function drawArmor(ctx: CanvasRenderingContext2D, p: SpritePalette): void {
  drawHead(ctx, p, false);
  // Pauldrons (square shoulders)
  block(ctx, 6, 14, 20, 4, p.body);
  block(ctx, 6, 14, 4, 6, p.outline);
  block(ctx, 22, 14, 4, 6, p.outline);
  // Chest plate
  block(ctx, 9, 18, 14, 13, p.body);
  // Plate cross trim
  block(ctx, 15, 18, 2, 13, p.trim);
  block(ctx, 9, 22, 14, 2, p.trim);
  // Arms
  block(ctx, 7, 18, 3, 12, p.body);
  block(ctx, 22, 18, 3, 12, p.body);
  // Hands
  block(ctx, 7, 30, 3, 2, p.skin);
  block(ctx, 22, 30, 3, 2, p.skin);
  // Greaves
  block(ctx, 11, 31, 4, 13, p.body);
  block(ctx, 17, 31, 4, 13, p.body);
  // Boots
  block(ctx, 10, 44, 6, 2, p.outline);
  block(ctx, 16, 44, 6, 2, p.outline);
}

function drawUndead(ctx: CanvasRenderingContext2D, p: SpritePalette): void {
  // Skull head (pale skin, no hair, hollow eyes)
  block(ctx, 11, 4, 10, 10, p.skin);
  block(ctx, 13, 9, 2, 2, p.eyes);
  block(ctx, 17, 9, 2, 2, p.eyes);
  block(ctx, 15, 11, 2, 1, shade(p.skin, 0.5));
  block(ctx, 14, 13, 4, 1, p.eyes); // grin
  // Torn robe / rib cage
  block(ctx, 11, 14, 10, 14, p.body);
  // Ribs (faint skin showing through tears)
  block(ctx, 13, 17, 6, 1, p.skin);
  block(ctx, 13, 20, 6, 1, p.skin);
  block(ctx, 13, 23, 6, 1, p.skin);
  // Skinny arms
  block(ctx, 9, 15, 2, 13, p.skin);
  block(ctx, 21, 15, 2, 13, p.skin);
  // Legs
  block(ctx, 12, 28, 3, 16, p.body);
  block(ctx, 17, 28, 3, 16, p.body);
  // Bone feet
  block(ctx, 11, 44, 4, 2, p.skin);
  block(ctx, 17, 44, 4, 2, p.skin);
}

function drawTunic(ctx: CanvasRenderingContext2D, p: SpritePalette): void {
  drawHead(ctx, p, false);
  // Tunic torso
  block(ctx, 9, 14, 14, 13, p.body);
  // Belt
  block(ctx, 9, 25, 14, 2, p.trim);
  // Collar v
  block(ctx, 14, 14, 4, 2, p.skin);
  // Arms
  block(ctx, 6, 14, 3, 13, p.body);
  block(ctx, 23, 14, 3, 13, p.body);
  // Hands
  block(ctx, 6, 26, 3, 2, p.skin);
  block(ctx, 23, 26, 3, 2, p.skin);
  // Pant legs
  block(ctx, 10, 27, 5, 17, p.bodyAccent);
  block(ctx, 17, 27, 5, 17, p.bodyAccent);
  // Boots
  block(ctx, 9, 44, 6, 2, p.outline);
  block(ctx, 17, 44, 6, 2, p.outline);
}

function drawCreature(ctx: CanvasRenderingContext2D, p: SpritePalette): void {
  // Squat blob — wider at the base, narrower top, two glowing eyes
  block(ctx, 10, 16, 12, 8, p.body);
  block(ctx, 8, 22, 16, 10, p.body);
  block(ctx, 6, 28, 20, 10, p.body);
  block(ctx, 4, 34, 24, 8, p.body);
  // Foot drip / shadow
  block(ctx, 6, 42, 20, 4, p.bodyAccent);
  // Highlight band along the top
  block(ctx, 12, 16, 8, 2, shade(p.body, -0.25));
  // Eye sockets
  block(ctx, 11, 22, 3, 3, p.outline);
  block(ctx, 18, 22, 3, 3, p.outline);
  // Glowing pupils
  block(ctx, 12, 23, 1, 1, p.eyes);
  block(ctx, 19, 23, 1, 1, p.eyes);
  // Toothy maw
  block(ctx, 13, 28, 6, 1, p.outline);
  block(ctx, 14, 29, 1, 1, p.skin);
  block(ctx, 16, 29, 1, 1, p.skin);
  block(ctx, 17, 29, 1, 1, p.skin);
}

export interface ProceduralNpcTextureResult {
  texture: THREE.CanvasTexture;
  palette: SpritePalette;
  archetype: SpriteArchetype;
}

export function makeProceduralNpcTexture(def: NpcDef): ProceduralNpcTextureResult {
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_W * PIXEL_SCALE;
  canvas.height = SPRITE_H * PIXEL_SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("makeProceduralNpcTexture: 2d context unavailable");

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const { palette, archetype } = paletteFor(def);
  switch (archetype) {
    case "robe": drawRobe(ctx, palette); break;
    case "armor": drawArmor(ctx, palette); break;
    case "undead": drawUndead(ctx, palette); break;
    case "creature": drawCreature(ctx, palette); break;
    case "tunic":
    default: drawTunic(ctx, palette); break;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return { texture, palette, archetype };
}
