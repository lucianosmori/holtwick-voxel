import * as THREE from "three";

export interface SkyColors {
  readonly zenith: string;
  readonly horizonTop: string;
  readonly horizonBottom: string;
  readonly ground: string;
}

export const DEFAULT_SKY: SkyColors = {
  zenith: "#3a78c4",
  horizonTop: "#9ec6f2",
  horizonBottom: "#f3d8a8",
  ground: "#2a2118",
};

const FACE_SIZE = 256;

type Face = "px" | "nx" | "py" | "ny" | "pz" | "nz";

interface Star {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// P9.5 — 80 seeded white pinpricks on the +Y top face. Seed=42 per the spec
// so the constellation is stable across reloads and across the day/night
// transition (alpha just fades in/out — the dot positions never move).
const STAR_COUNT_TOP = 80;
const TOP_STARS: ReadonlyArray<Star> = (() => {
  const rng = mulberry32(42);
  const out: Star[] = [];
  for (let i = 0; i < STAR_COUNT_TOP; i++) {
    out.push({
      x: Math.floor(rng() * FACE_SIZE),
      y: Math.floor(rng() * FACE_SIZE),
      r: rng() < 0.5 ? 1 : 2,
    });
  }
  return out;
})();

// The camera is locked at ~35° below horizontal with a 55° vertical FOV, so
// the +Y face is never sampled by an on-screen ray (top of the frame peaks
// at ~-7.5° below horizontal — still pointing at the -Z/+X horizon faces).
// To make the night sky read for the player we also paint a thinner
// constellation in the top fifth of each horizon face (the zenith band).
// Seed=43 keeps these dots distinct from the top-face set yet stable.
const STAR_COUNT_HORIZON = 24;
const HORIZON_BAND_HEIGHT = Math.floor(FACE_SIZE * 0.2);
const HORIZON_STARS: ReadonlyArray<Star> = (() => {
  const rng = mulberry32(43);
  const out: Star[] = [];
  for (let i = 0; i < STAR_COUNT_HORIZON; i++) {
    out.push({
      x: Math.floor(rng() * FACE_SIZE),
      y: Math.floor(rng() * HORIZON_BAND_HEIGHT),
      r: rng() < 0.5 ? 1 : 2,
    });
  }
  return out;
})();

function paintStars(
  ctx: CanvasRenderingContext2D,
  stars: ReadonlyArray<Star>,
  alpha: number,
): void {
  if (alpha <= 0) return;
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  for (const s of stars) ctx.fillRect(s.x, s.y, s.r, s.r);
}

function paintHorizonFace(
  ctx: CanvasRenderingContext2D,
  colors: SkyColors,
  nightAlpha: number,
): void {
  const grad = ctx.createLinearGradient(0, 0, 0, FACE_SIZE);
  grad.addColorStop(0, colors.zenith);
  grad.addColorStop(0.5, colors.horizonTop);
  grad.addColorStop(0.62, colors.horizonBottom);
  grad.addColorStop(1, colors.ground);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, FACE_SIZE, FACE_SIZE);

  paintStars(ctx, HORIZON_STARS, nightAlpha);

  // Stylized horizon line — a single warm pixel band where sky meets earth.
  ctx.fillStyle = "rgba(255, 220, 170, 0.35)";
  ctx.fillRect(0, Math.floor(FACE_SIZE * 0.6), FACE_SIZE, 2);
}

function paintTopFace(
  ctx: CanvasRenderingContext2D,
  colors: SkyColors,
  nightAlpha: number,
): void {
  // Radial fade from zenith at center to horizonTop near edges — reads as
  // a clean dome when the camera tips up past 55°.
  const grad = ctx.createRadialGradient(
    FACE_SIZE / 2,
    FACE_SIZE / 2,
    FACE_SIZE * 0.1,
    FACE_SIZE / 2,
    FACE_SIZE / 2,
    FACE_SIZE * 0.75,
  );
  grad.addColorStop(0, colors.zenith);
  grad.addColorStop(1, colors.horizonTop);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, FACE_SIZE, FACE_SIZE);

  paintStars(ctx, TOP_STARS, nightAlpha);
}

function paintBottomFace(ctx: CanvasRenderingContext2D, colors: SkyColors): void {
  ctx.fillStyle = colors.ground;
  ctx.fillRect(0, 0, FACE_SIZE, FACE_SIZE);
}

function makeFaceCanvas(
  face: Face,
  colors: SkyColors,
  nightAlpha: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = FACE_SIZE;
  canvas.height = FACE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("sky: failed to acquire 2D context");

  if (face === "py") paintTopFace(ctx, colors, nightAlpha);
  else if (face === "ny") paintBottomFace(ctx, colors);
  else paintHorizonFace(ctx, colors, nightAlpha);

  return canvas;
}

// CubeTexture face order is px, nx, py, ny, pz, nz.
const FACE_ORDER: readonly Face[] = ["px", "nx", "py", "ny", "pz", "nz"];

export interface ProceduralSky {
  readonly texture: THREE.CubeTexture;
  setNightAlpha(alpha: number): void;
  getNightAlpha(): number;
}

export function buildProceduralSky(colors: SkyColors = DEFAULT_SKY): ProceduralSky {
  const canvases = FACE_ORDER.map((face) => makeFaceCanvas(face, colors, 0));
  const tex = new THREE.CubeTexture(canvases);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;

  let currentAlpha = 0;
  return {
    texture: tex,
    getNightAlpha: () => currentAlpha,
    setNightAlpha(alpha: number): void {
      const clamped = Math.max(0, Math.min(1, alpha));
      // Skip redraws when the value hasn't meaningfully changed — main.ts
      // calls this every frame, so the early-return keeps the per-frame cost
      // to a single comparison except at the two phase crossings per cycle.
      if (Math.abs(clamped - currentAlpha) < 1e-3) return;
      currentAlpha = clamped;
      for (let i = 0; i < FACE_ORDER.length; i++) {
        const face = FACE_ORDER[i];
        if (face === "ny") continue; // bottom face is ground — no stars
        const ctx = canvases[i].getContext("2d");
        if (!ctx) continue;
        if (face === "py") paintTopFace(ctx, colors, clamped);
        else paintHorizonFace(ctx, colors, clamped);
      }
      tex.needsUpdate = true;
    },
  };
}
