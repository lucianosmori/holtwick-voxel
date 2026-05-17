import * as THREE from "three";

// P9.4 — two warm candle PointLights inside the tavern interior. Together
// with the P9.1 hearth they keep the bar/table area readable regardless of
// time of day. Plan-locked positions: candle A above the bar (cell 30,16),
// candle B above the table cluster (cell 32,17). Y=2.5 puts them just under
// the roof voxels at y=3. Colour 0xffdc70 = warm yellow; intensity 0.6,
// range 3 — short reach so the warm pool stays contained inside the tavern
// box and doesn't bleed onto outdoor cells.
//
// Constant intensity (not phase-ramped). The hearth is also constant; both
// outdoor lantern systems (lanterns, lamp posts) handle the day/night ramp.
export const CANDLE_COLOR = 0xffdc70;
export const CANDLE_INTENSITY = 0.6;
export const CANDLE_RANGE = 3;
export const CANDLE_Y = 2.5;

interface CandleCell {
  readonly cellX: number;
  readonly cellZ: number;
  readonly label: string;
}

const CANDLE_CELLS: ReadonlyArray<CandleCell> = [
  { cellX: 30, cellZ: 16, label: "tavern:candle_bar" },
  { cellX: 32, cellZ: 17, label: "tavern:candle_table" },
];

export interface IndoorCandle {
  readonly light: THREE.PointLight;
  readonly label: string;
}

export function buildIndoorCandles(gridOffset: THREE.Vector3): IndoorCandle[] {
  return CANDLE_CELLS.map(({ cellX, cellZ, label }) => {
    const light = new THREE.PointLight(CANDLE_COLOR, CANDLE_INTENSITY, CANDLE_RANGE);
    light.name = label;
    light.position.set(
      gridOffset.x + cellX + 0.5,
      CANDLE_Y,
      gridOffset.z + cellZ + 0.5,
    );
    return { light, label };
  });
}
