// P7.3 minimap HUD — top-left 150×150 2D canvas. Static layer (background +
// roads + plaza + tavern outline) is pre-rendered once into an offscreen
// canvas; per-update we composite the static layer + dynamic dots (items,
// lanterns, NPCs, player). Caller is responsible for throttling — main.ts
// invokes `update()` every 10 frames per the spec.

import {
  TAVERN_ORIGIN_X,
  TAVERN_ORIGIN_Z,
  VILLAGE_DEPTH,
  VILLAGE_WIDTH,
} from "../world/village";
import {
  TAVERN_INTERIOR_DEPTH,
  TAVERN_INTERIOR_WIDTH,
} from "../world/tavern";

export interface MinimapEntity {
  worldX: number;
  worldZ: number;
}

export interface MinimapLantern extends MinimapEntity {
  lit: boolean;
}

export interface MinimapFrame {
  player: MinimapEntity;
  npcs: ReadonlyArray<MinimapEntity>;
  items: ReadonlyArray<MinimapEntity>;
  lanterns: ReadonlyArray<MinimapLantern>;
}

export interface Minimap {
  update(frame: MinimapFrame): void;
}

const MINIMAP_PX = 150;
const VOXEL_PX = 2;
const PLAZA_HALF = 10;
const ROAD_HALF = 3;

const BG_COLOR = "#1a1f2c";
const ROAD_COLOR = "#3d3530";
const PLAZA_COLOR = "#5a5e6a";
const TAVERN_FILL = "rgba(217, 119, 87, 0.35)";
const TAVERN_STROKE = "#d97757";
const PLAYER_COLOR = "#ffd84a";
const NPC_COLOR = "#48c0ff";
const ITEM_COLOR = "#ffc850";
const LANTERN_COLOR = "#ffb070";

// Centre the 128×128 village inside the 150 canvas.
const MARGIN_PX = Math.floor((MINIMAP_PX - VILLAGE_WIDTH * VOXEL_PX) / 2);

function cellToPx(cell: number): number {
  return MARGIN_PX + cell * VOXEL_PX;
}

export function mountMinimap(gridOffset: { readonly x: number; readonly z: number }): Minimap {
  const canvas = document.getElementById("minimap") as HTMLCanvasElement | null;
  if (!canvas) throw new Error("mountMinimap: missing #minimap canvas");
  canvas.width = MINIMAP_PX;
  canvas.height = MINIMAP_PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("mountMinimap: 2D context unavailable");

  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = MINIMAP_PX;
  baseCanvas.height = MINIMAP_PX;
  const baseCtx = baseCanvas.getContext("2d");
  if (!baseCtx) throw new Error("mountMinimap: 2D context unavailable (base)");
  drawStatic(baseCtx);

  return {
    update(frame: MinimapFrame): void {
      ctx.clearRect(0, 0, MINIMAP_PX, MINIMAP_PX);
      ctx.drawImage(baseCanvas, 0, 0);

      ctx.fillStyle = ITEM_COLOR;
      for (const it of frame.items) {
        const cx = it.worldX - gridOffset.x;
        const cz = it.worldZ - gridOffset.z;
        ctx.fillRect(cellToPx(cx) - 1, cellToPx(cz) - 1, 2, 2);
      }

      ctx.fillStyle = LANTERN_COLOR;
      for (const l of frame.lanterns) {
        if (!l.lit) continue;
        const cx = l.worldX - gridOffset.x;
        const cz = l.worldZ - gridOffset.z;
        ctx.fillRect(cellToPx(cx) - 2, cellToPx(cz) - 2, 4, 4);
      }

      ctx.fillStyle = NPC_COLOR;
      for (const n of frame.npcs) {
        const cx = n.worldX - gridOffset.x;
        const cz = n.worldZ - gridOffset.z;
        ctx.fillRect(cellToPx(cx) - 1, cellToPx(cz) - 1, 3, 3);
      }

      const px = frame.player.worldX - gridOffset.x;
      const pz = frame.player.worldZ - gridOffset.z;
      ctx.fillStyle = PLAYER_COLOR;
      ctx.fillRect(cellToPx(px) - 2, cellToPx(pz) - 2, 4, 4);
    },
  };
}

function drawStatic(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, MINIMAP_PX, MINIMAP_PX);

  const cx = Math.floor(VILLAGE_WIDTH / 2);
  const cz = Math.floor(VILLAGE_DEPTH / 2);

  ctx.fillStyle = ROAD_COLOR;
  ctx.fillRect(
    cellToPx(cx - ROAD_HALF),
    cellToPx(0),
    (ROAD_HALF * 2 + 1) * VOXEL_PX,
    VILLAGE_DEPTH * VOXEL_PX,
  );
  ctx.fillRect(
    cellToPx(0),
    cellToPx(cz - ROAD_HALF),
    VILLAGE_WIDTH * VOXEL_PX,
    (ROAD_HALF * 2 + 1) * VOXEL_PX,
  );

  ctx.fillStyle = PLAZA_COLOR;
  ctx.fillRect(
    cellToPx(cx - PLAZA_HALF),
    cellToPx(cz - PLAZA_HALF),
    PLAZA_HALF * 2 * VOXEL_PX,
    PLAZA_HALF * 2 * VOXEL_PX,
  );

  const footW = TAVERN_INTERIOR_WIDTH + 2;
  const footD = TAVERN_INTERIOR_DEPTH + 2;
  ctx.fillStyle = TAVERN_FILL;
  ctx.fillRect(
    cellToPx(TAVERN_ORIGIN_X),
    cellToPx(TAVERN_ORIGIN_Z),
    footW * VOXEL_PX,
    footD * VOXEL_PX,
  );
  ctx.strokeStyle = TAVERN_STROKE;
  ctx.lineWidth = 1;
  ctx.strokeRect(
    cellToPx(TAVERN_ORIGIN_X) + 0.5,
    cellToPx(TAVERN_ORIGIN_Z) + 0.5,
    footW * VOXEL_PX - 1,
    footD * VOXEL_PX - 1,
  );
}
