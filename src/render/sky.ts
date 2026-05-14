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

function paintHorizonFace(ctx: CanvasRenderingContext2D, colors: SkyColors): void {
  const grad = ctx.createLinearGradient(0, 0, 0, FACE_SIZE);
  grad.addColorStop(0, colors.zenith);
  grad.addColorStop(0.5, colors.horizonTop);
  grad.addColorStop(0.62, colors.horizonBottom);
  grad.addColorStop(1, colors.ground);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, FACE_SIZE, FACE_SIZE);

  // Stylized horizon line — a single warm pixel band where sky meets earth.
  ctx.fillStyle = "rgba(255, 220, 170, 0.35)";
  ctx.fillRect(0, Math.floor(FACE_SIZE * 0.6), FACE_SIZE, 2);
}

function paintTopFace(ctx: CanvasRenderingContext2D, colors: SkyColors): void {
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
}

function paintBottomFace(ctx: CanvasRenderingContext2D, colors: SkyColors): void {
  ctx.fillStyle = colors.ground;
  ctx.fillRect(0, 0, FACE_SIZE, FACE_SIZE);
}

function makeFaceCanvas(face: Face, colors: SkyColors): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = FACE_SIZE;
  canvas.height = FACE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("sky: failed to acquire 2D context");

  if (face === "py") paintTopFace(ctx, colors);
  else if (face === "ny") paintBottomFace(ctx, colors);
  else paintHorizonFace(ctx, colors);

  return canvas;
}

// CubeTexture face order is px, nx, py, ny, pz, nz.
const FACE_ORDER: readonly Face[] = ["px", "nx", "py", "ny", "pz", "nz"];

export function buildProceduralSky(colors: SkyColors = DEFAULT_SKY): THREE.CubeTexture {
  const images = FACE_ORDER.map((face) => makeFaceCanvas(face, colors));
  const tex = new THREE.CubeTexture(images);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
