// Spawn positions + visual styling for the Holtwick tavern cast.
// Cell coords are voxel-grid (pre-offset); main.ts adds the gridOffset.
// Background colors are placeholders until the PixelLab pixflux sprite
// batch is unblocked (P3.1b — currently blocked on credit top-up).

import type { NpcDef } from "./npc.schema";
import {
  EDDA, FINN, ALDRIC, MIREILLE, BORAN, WREN, CASSIA,
  KARSTEN, HILDA, PETRA, RONAN, DORIN,
} from "./tavernCast";

export interface PathWaypoint {
  cellX: number;
  cellZ: number;
  pauseSec: number;
}

export interface NpcSpawn {
  def: NpcDef;
  cellX: number;
  cellZ: number;
  background: string;
  foreground?: string;
  path?: PathWaypoint[];
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
  {
    def: EDDA,
    cellX: 31, cellZ: 17, background: "#d97757", // tavern interior, north
    path: [
      { cellX: 31, cellZ: 17, pauseSec: 3 },
      { cellX: 32, cellZ: 19, pauseSec: 3 },
    ],
  },
  {
    def: FINN,
    cellX: 30, cellZ: 16, background: "#5e7da8", // tavern interior, corner
    path: [
      { cellX: 30, cellZ: 16, pauseSec: 2 },
      { cellX: 36, cellZ: 22, pauseSec: 2 }, // by Boran (forge-stand-in until P7.1)
    ],
  },
  { def: ALDRIC,   cellX: 28, cellZ: 30, background: "#7a7a82" }, // plaza NW
  {
    def: CASSIA,
    cellX: 36, cellZ: 34, background: "#9a5e8c", // plaza E (3rd walker — Bren slot)
    path: [
      { cellX: 36, cellZ: 34, pauseSec: 4 },
      { cellX: 32, cellZ: 22, pauseSec: 4 }, // toward tavern doorway from plaza
    ],
  },
  { def: BORAN,    cellX: 36, cellZ: 22, background: "#8b6b3a" }, // outside tavern, south of door
  { def: WREN,     cellX: 50, cellZ: 38, background: "#b89870" }, // east edge, near stables
  { def: MIREILLE, cellX: 18, cellZ: 46, background: "#5e8a4a" }, // pond edge, herb garden
  // P7.2 — 5 new NPCs anchored on the P7.1 buildings (blacksmith, well,
  // 2 market stalls, plaza). Cell coords chosen so each NPC stands on a
  // walkable cell inside/adjacent to their landmark without clipping a
  // wall post or stall corner.
  { def: KARSTEN,  cellX: 21, cellZ: 22, background: "#a86b2a" }, // blacksmith interior, next to anvil
  { def: HILDA,    cellX: 46, cellZ: 28, background: "#5a6878" }, // 2 cells north of well centre
  { def: PETRA,    cellX: 21, cellZ: 36, background: "#c89a5e" }, // market stall 1, between posts
  { def: RONAN,    cellX: 25, cellZ: 36, background: "#4a5e7a" }, // market stall 2, between posts
  { def: DORIN,    cellX: 28, cellZ: 32, background: "#6e6258" }, // plaza centre, between Aldric + Cassia
];
