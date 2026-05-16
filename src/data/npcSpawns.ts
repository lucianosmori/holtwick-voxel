// Spawn positions + visual styling for the Holtwick tavern cast.
// Cell coords are voxel-grid (pre-offset); main.ts adds the gridOffset.
// Background colors are placeholders until the PixelLab pixflux sprite
// batch is unblocked (P3.1b — currently blocked on credit top-up).

import type { NpcDef } from "./npc.schema";
import { EDDA, FINN, ALDRIC, MIREILLE, BORAN, WREN, CASSIA } from "./tavernCast";

export interface NpcSpawn {
  def: NpcDef;
  cellX: number;
  cellZ: number;
  background: string;
  foreground?: string;
}

// Village layout reference (`world/village.ts`):
//   - 64x64 grid
//   - Stone plaza centered at (32, 32), 20x20
//   - Tavern building at originX=28, originZ=14 (8x6 footprint), doorway at south x=32
//   - Water pond at (12, 50), radius 8
//   - Dirt roads radiating N/S/E/W from plaza
//
// Spawns chosen to spread the cast across recognizable landmarks so the
// player meets a new NPC every ~10 voxels of walking.

export const NPC_SPAWNS: NpcSpawn[] = [
  { def: EDDA,     cellX: 31, cellZ: 17, background: "#d97757" }, // tavern interior, north
  { def: FINN,     cellX: 30, cellZ: 16, background: "#5e7da8" }, // tavern interior, corner
  { def: ALDRIC,   cellX: 28, cellZ: 30, background: "#7a7a82" }, // plaza NW
  { def: CASSIA,   cellX: 36, cellZ: 34, background: "#9a5e8c" }, // plaza E
  { def: BORAN,    cellX: 36, cellZ: 22, background: "#8b6b3a" }, // outside tavern, south of door
  { def: WREN,     cellX: 50, cellZ: 38, background: "#b89870" }, // east edge, near stables
  { def: MIREILLE, cellX: 18, cellZ: 46, background: "#5e8a4a" }, // pond edge, herb garden
];
