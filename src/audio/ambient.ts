// Procedural ambient audio: shared AudioContext + master gain + day/night
// crossfade. All synthesis via Web Audio API nodes — no asset downloads.
// AudioContext creation is gesture-gated by main.ts (browsers block audio
// without a user interaction).

const VOLUME_KEY = "holtwick-voxel:audio:volume";
const CROSSFADE_SEC = 3.0;

type Ctor = typeof AudioContext;
type Win = Window & { webkitAudioContext?: Ctor; __audioCtx?: AudioContext };

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let dayGain: GainNode | null = null;
let nightGain: GainNode | null = null;
let chirpAccum = 0;
let nextChirpAt = 6;
let currentVolume = 0.5;

function createCtx(): AudioContext | null {
  const w = window as Win;
  const C: Ctor | undefined = window.AudioContext ?? w.webkitAudioContext;
  if (!C) return null;
  try {
    return new C();
  } catch {
    return null;
  }
}

function loadStoredVolume(): number {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw === null) return 0.5;
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return 0.5;
    return Math.max(0, Math.min(1, n));
  } catch {
    return 0.5;
  }
}

// Paul Kellet's economy pink-noise filter: cheap to evaluate, audibly closer
// to nature than raw white noise once lowpassed.
function pinkNoiseBuffer(c: AudioContext, durSec: number): AudioBuffer {
  const n = Math.max(1, Math.floor(c.sampleRate * durSec));
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < n; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.0990460;
    b1 = 0.96300 * b1 + white * 0.2965164;
    b2 = 0.57000 * b2 + white * 1.0526913;
    data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.18;
  }
  return buf;
}

function buildDayChain(c: AudioContext, dest: AudioNode): GainNode {
  const gain = c.createGain();
  gain.gain.value = 0;
  gain.connect(dest);

  const noiseSrc = c.createBufferSource();
  noiseSrc.buffer = pinkNoiseBuffer(c, 2);
  noiseSrc.loop = true;
  const noiseFilter = c.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.value = 800;
  const noiseGain = c.createGain();
  noiseGain.gain.value = 0.22;
  noiseSrc.connect(noiseFilter).connect(noiseGain).connect(gain);
  noiseSrc.start();

  const rumble = c.createOscillator();
  rumble.type = "sine";
  rumble.frequency.value = 110;
  const rumbleGain = c.createGain();
  rumbleGain.gain.value = 0.02;
  rumble.connect(rumbleGain).connect(gain);
  rumble.start();

  return gain;
}

function buildNightChain(c: AudioContext, dest: AudioNode): GainNode {
  // 4kHz sine carrier whose gain is amplitude-modulated by an 8Hz LFO,
  // giving a throbbing cricket pulse. Master sits below day volume per spec.
  const gain = c.createGain();
  gain.gain.value = 0;
  gain.connect(dest);

  const carrier = c.createOscillator();
  carrier.type = "sine";
  carrier.frequency.value = 4000;

  const amGain = c.createGain();
  amGain.gain.value = 0.018; // baseline; LFO adds ±0.018 on top

  const lfo = c.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 8;
  const lfoScale = c.createGain();
  lfoScale.gain.value = 0.018;
  lfo.connect(lfoScale).connect(amGain.gain);

  carrier.connect(amGain).connect(gain);
  carrier.start();
  lfo.start();

  return gain;
}

function chirp(c: AudioContext, dest: AudioNode): void {
  const now = c.currentTime;
  const dur = 0.18;
  const osc = c.createOscillator();
  osc.type = "sine";
  const freq = 1200 + Math.random() * 1200;
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 1.4, now + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(g).connect(dest);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

// Phase windows match the P6.8 spec literally: night ambient owns 0.7..0.95,
// day ambient owns the rest. 3-second crossfade between them.
function isNight(phase: number): boolean {
  return phase >= 0.7 && phase < 0.95;
}

export function startAmbient(): AudioContext | null {
  if (ctx) return ctx;
  const c = createCtx();
  if (!c) return null;
  ctx = c;
  if (c.state === "suspended") void c.resume();

  masterGain = c.createGain();
  currentVolume = loadStoredVolume();
  masterGain.gain.value = currentVolume;
  masterGain.connect(c.destination);

  dayGain = buildDayChain(c, masterGain);
  nightGain = buildNightChain(c, masterGain);

  (window as Win).__audioCtx = c;
  return c;
}

export function updateAmbient(dt: number, phase: number): void {
  if (!ctx || !dayGain || !nightGain || !masterGain) return;
  const targetNight = isNight(phase) ? 1 : 0;
  const targetDay = 1 - targetNight;
  // Exponential approach: ~95% to target across CROSSFADE_SEC.
  const tau = CROSSFADE_SEC / 3;
  const alpha = 1 - Math.exp(-dt / tau);
  dayGain.gain.value += (targetDay - dayGain.gain.value) * alpha;
  nightGain.gain.value += (targetNight - nightGain.gain.value) * alpha;

  if (targetDay > 0.5 && dayGain.gain.value > 0.3) {
    chirpAccum += dt;
    if (chirpAccum >= nextChirpAt) {
      chirp(ctx, masterGain);
      chirpAccum = 0;
      nextChirpAt = 5 + Math.random() * 10;
    }
  } else {
    chirpAccum = 0;
    nextChirpAt = 6;
  }
}

export function setMasterVolume(v: number): void {
  currentVolume = Math.max(0, Math.min(1, v));
  if (masterGain) masterGain.gain.value = currentVolume;
  try {
    localStorage.setItem(VOLUME_KEY, currentVolume.toString());
  } catch {
    /* localStorage may be unavailable in private mode — silent no-op */
  }
}

export function getMasterVolume(): number {
  return currentVolume;
}

export function getAudioContext(): AudioContext | null {
  return ctx;
}

export function getMasterGain(): GainNode | null {
  return masterGain;
}
