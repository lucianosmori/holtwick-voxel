// Day/night cycle. Drives the scene's DirectionalLight (sun) on an orbit
// around the village and shifts both sun + HemisphereLight colors with
// the elevation. The full cycle is fast on purpose so a player landing
// on the live URL sees day → dusk → night → dawn within ~2 minutes.
//
// The cycle phase is exposed via `?dayNight=<0..1>` URL param so the
// Playwright visual gate can snapshot at a specific time-of-day.

import * as THREE from "three";

export const DAY_NIGHT_SECONDS = 120; // full 24h cycle in 2 minutes

const SUN_RADIUS = 50;
const SUN_DAY_COLOR = new THREE.Color(0xffeecc);   // warm noon
const SUN_DUSK_COLOR = new THREE.Color(0xff9966);  // dawn/dusk orange
const SUN_NIGHT_COLOR = new THREE.Color(0x6688aa); // cool moonlight

const HEMI_DAY_SKY = new THREE.Color(0xbcd6ff);
const HEMI_DAY_GROUND = new THREE.Color(0x4a3a2a);
const HEMI_NIGHT_SKY = new THREE.Color(0x223355);
const HEMI_NIGHT_GROUND = new THREE.Color(0x1a1f2c);

export class DayNight {
  private elapsed = 0;
  private readonly tmpColor = new THREE.Color();
  private readonly phaseOverride: number | null;

  constructor(
    private readonly sun: THREE.DirectionalLight,
    private readonly hemi: THREE.HemisphereLight,
    private readonly cycleSeconds: number = DAY_NIGHT_SECONDS,
  ) {
    // URL-gated time scrub for the visual gate: `?dayNight=0.25` locks at
    // mid-morning, `?dayNight=0.75` at midnight, etc.
    let override: number | null = null;
    if (typeof window !== "undefined") {
      const raw = new URLSearchParams(window.location.search).get("dayNight");
      if (raw !== null) {
        const parsed = parseFloat(raw);
        if (Number.isFinite(parsed)) override = ((parsed % 1) + 1) % 1;
      }
    }
    this.phaseOverride = override;
    this.apply(this.phaseOverride ?? 0);
  }

  update(dt: number): void {
    if (this.phaseOverride !== null) return; // locked time-of-day for tests
    this.elapsed = (this.elapsed + dt) % this.cycleSeconds;
    const phase = this.elapsed / this.cycleSeconds; // 0..1
    this.apply(phase);
  }

  // phase 0 = noon, 0.25 = dusk, 0.5 = midnight, 0.75 = dawn
  private apply(phase: number): void {
    const angle = phase * Math.PI * 2;
    // Sun orbits in XZ plane, peaks overhead at noon.
    const sunY = SUN_RADIUS * Math.cos(angle);
    const sunX = SUN_RADIUS * Math.sin(angle);
    const sunZ = SUN_RADIUS * 0.4 * Math.sin(angle); // slight southerly drift
    this.sun.position.set(sunX, sunY, sunZ);

    // Elevation -1..1 → intensity + color blend.
    const elevation = sunY / SUN_RADIUS;
    const day = Math.max(0, elevation);            // 0..1 above horizon
    const night = Math.max(0, -elevation);         // 0..1 below horizon
    const horizon = 1 - Math.abs(elevation);       // peaks at sunrise/sunset

    // Sun intensity: full at noon, near-zero at night, warm bloom at horizon.
    this.sun.intensity = 0.05 + day * 1.15;
    // Sun color: blend day → dusk → night based on elevation.
    this.tmpColor.copy(SUN_NIGHT_COLOR);
    this.tmpColor.lerp(SUN_DUSK_COLOR, horizon);
    this.tmpColor.lerp(SUN_DAY_COLOR, day);
    this.sun.color.copy(this.tmpColor);

    // Hemisphere fade: day vs night ground/sky colors.
    this.hemi.color.copy(HEMI_NIGHT_SKY).lerp(HEMI_DAY_SKY, day);
    this.hemi.groundColor.copy(HEMI_NIGHT_GROUND).lerp(HEMI_DAY_GROUND, day);
    this.hemi.intensity = 0.15 + day * 0.35;

    // Shadow flicker prevention: turn off the sun's shadow when it dips
    // well below the horizon so dark-side faces don't get black tag-along
    // shadow seams from a sun below the ground plane.
    this.sun.castShadow = night < 0.6;
  }

  get currentPhase(): number {
    return this.phaseOverride ?? (this.elapsed / this.cycleSeconds);
  }
}
