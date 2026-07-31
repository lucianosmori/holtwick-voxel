import * as THREE from "three";
import { LANTERN_MAX_INTENSITY, lanternIntensityForPhase } from "./lanterns";

// A small warm pool of light carried by the player, so the character stays
// readable once the sun is down. Deliberately built as a mobile sibling of the
// P6.10 corner lanterns — same warm hue, same dusk-onset ramp — so it reads as
// "the player is carrying one of the village lanterns" rather than as a
// separate lighting system that happens to follow them around.
export const PLAYER_GLOW_COLOR = 0xffc890;
export const PLAYER_GLOW_RANGE = 5;
// Well under the lanterns' 1.5: this is meant to pick the player out of the
// dark, not to turn them into a walking floodlight that flattens the night.
export const PLAYER_GLOW_MAX_INTENSITY = 0.85;
// Carried ABOVE the 0.6-voxel player cube. A light sitting inside the mesh
// would only ever reach its back faces, leaving the player exactly as dark as
// before while still lighting the ground — the offset is what makes the
// character itself visible.
export const PLAYER_GLOW_Y_OFFSET = 1.1;

// Parented to the player mesh, so it tracks movement (including the test
// hook's warps and the save-restore snap) with no per-frame position work.
export function buildPlayerGlow(playerMesh: THREE.Object3D): THREE.PointLight {
  const light = new THREE.PointLight(PLAYER_GLOW_COLOR, 0, PLAYER_GLOW_RANGE);
  light.name = "player:glow";
  light.position.set(0, PLAYER_GLOW_Y_OFFSET, 0);
  playerMesh.add(light);
  return light;
}

// Reuses the lanterns' tuned dusk/dawn curve (normalised back to 0..1) so the
// player's glow ignites on exactly the same beat as the village's and fades
// out at dawn together with them.
export function playerGlowIntensityForPhase(phase: number): number {
  const ramp = lanternIntensityForPhase(phase) / LANTERN_MAX_INTENSITY;
  return ramp * PLAYER_GLOW_MAX_INTENSITY;
}

export function updatePlayerGlow(light: THREE.PointLight, phase: number): void {
  light.intensity = playerGlowIntensityForPhase(phase);
}
