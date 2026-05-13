// Procedural WebAudio sound effects. No audio files; everything synthesized.
// AudioContext is created lazily on first play() because browsers require a
// user gesture before audio can start.

type Ctor = typeof AudioContext;
type Win = Window & { webkitAudioContext?: Ctor };

let ctx: AudioContext | null = null;
let unavailable = false;

function getCtx(): AudioContext | null {
  if (unavailable) return null;
  if (ctx) {
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }
  const w = window as Win;
  const C: Ctor | undefined = window.AudioContext ?? w.webkitAudioContext;
  if (!C) {
    unavailable = true;
    return null;
  }
  try {
    ctx = new C();
    return ctx;
  } catch {
    unavailable = true;
    return null;
  }
}

function noiseBuffer(c: AudioContext, durSec: number): AudioBuffer {
  const n = Math.max(1, Math.floor(c.sampleRate * durSec));
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

export function playStep(): void {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const dur = 0.05;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, dur);
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 800;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(now);
  src.stop(now + dur);
}

export function playHit(): void {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const dur = 0.12;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, dur);
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1200;
  filter.Q.value = 0.8;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(now);
  src.stop(now + dur);

  const osc = c.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
  const og = c.createGain();
  og.gain.setValueAtTime(0.15, now);
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(og).connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.09);
}

export function playDeath(): void {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const dur = 0.55;
  const osc = c.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(55, now + dur);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.22, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(now);
  osc.stop(now + dur);

  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, dur);
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2000, now);
  filter.frequency.exponentialRampToValueAtTime(200, now + dur);
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.1, now);
  ng.gain.exponentialRampToValueAtTime(0.001, now + dur);
  src.connect(filter).connect(ng).connect(c.destination);
  src.start(now);
  src.stop(now + dur);
}
