// Procedural footsteps: triggered every STEP_DISTANCE player-units travelled.
// Pure Web Audio — 50ms white-noise burst through a 600Hz lowpass with
// ±10% pitch jitter, routed through the shared master gain so the volume
// slider attenuates both ambient + footsteps together.

import { getAudioContext, getMasterGain } from "./ambient";

const STEP_DISTANCE = 0.3;

let inited = false;
let lastX = 0;
let lastZ = 0;

export function maybeStep(x: number, z: number): void {
  if (!inited) {
    lastX = x;
    lastZ = z;
    inited = true;
    return;
  }
  const dx = x - lastX;
  const dz = z - lastZ;
  if (dx * dx + dz * dz < STEP_DISTANCE * STEP_DISTANCE) return;
  lastX = x;
  lastZ = z;
  playStep();
}

function playStep(): void {
  const c = getAudioContext();
  const master = getMasterGain();
  if (!c || !master) return;
  const now = c.currentTime;
  const dur = 0.05;
  const n = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = 0.9 + Math.random() * 0.2;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 600;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  src.connect(filter).connect(gain).connect(master);
  src.start(now);
  src.stop(now + dur + 0.02);
}

// Test/load hook: snap the internal cursor without playing a step. Used when
// the player position is teleported (save restore, test movePlayerTo) so the
// next real movement doesn't fire a burst of phantom footsteps.
export function resetFootstepCursor(x: number, z: number): void {
  lastX = x;
  lastZ = z;
  inited = true;
}
