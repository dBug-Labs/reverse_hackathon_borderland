// Synthesised sound effects for the live games (Web Audio, no files).

import { isSoundEnabled } from './sound';

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === 'undefined' || !isSoundEnabled()) return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; at?: number; to?: number } = {}) {
  const c = ac();
  if (!c) return;
  try {
    const t = c.currentTime + (opts.at ?? 0);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = opts.type ?? 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    g.gain.setValueAtTime(opts.vol ?? 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {
    /* audio blocked */
  }
}

function noise(dur: number, opts: { vol?: number; from?: number; to?: number; at?: number } = {}) {
  const c = ac();
  if (!c) return;
  try {
    const t = c.currentTime + (opts.at ?? 0);
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(opts.from ?? 400, t);
    f.frequency.exponentialRampToValueAtTime(opts.to ?? 4000, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(opts.vol ?? 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
  } catch {
    /* audio blocked */
  }
}

export const sfx = {
  tick: () => tone(1400, 0.05, { type: 'square', vol: 0.04 }),
  count: (last = false) => tone(last ? 1320 : 660, last ? 0.5 : 0.18, { type: 'triangle', vol: 0.18 }),
  lock: () => {
    tone(520, 0.08, { type: 'square', vol: 0.06 });
    tone(780, 0.12, { type: 'square', vol: 0.06, at: 0.06 });
  },
  correct: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, { type: 'triangle', vol: 0.14, at: i * 0.07 })),
  wrong: () => {
    tone(160, 0.5, { type: 'sawtooth', vol: 0.12 });
    tone(110, 0.6, { type: 'sawtooth', vol: 0.1, at: 0.08 });
  },
  whoosh: () => noise(0.7, { from: 300, to: 6000, vol: 0.25 }),
  boom: () => {
    tone(90, 1.2, { vol: 0.4, to: 30 });
    noise(0.6, { from: 2000, to: 100, vol: 0.3 });
  },
  slam: () => {
    tone(70, 0.6, { vol: 0.45, to: 40 });
    noise(0.25, { from: 3000, to: 300, vol: 0.25 });
  },
  rise: () => tone(200, 1.6, { type: 'sawtooth', vol: 0.06, to: 1600 }),
  cash: () => {
    tone(1568, 0.12, { type: 'square', vol: 0.05 });
    tone(2093, 0.3, { type: 'square', vol: 0.05, at: 0.08 });
  },
  siren: () => {
    for (let i = 0; i < 3; i++) {
      tone(600, 0.35, { type: 'sawtooth', vol: 0.08, at: i * 0.7, to: 1100 });
      tone(1100, 0.35, { type: 'sawtooth', vol: 0.08, at: i * 0.7 + 0.35, to: 600 });
    }
  },
  bell: () =>
    [1, 2.76, 5.4, 8.93].forEach((m, i) => {
      tone(440 * m, 2.6 - i * 0.4, { vol: 0.12 / (i + 1) });
      tone(440 * m, 2.6 - i * 0.4, { vol: 0.12 / (i + 1), at: 0.9 });
    }),
  fanfare: () =>
    [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i === 6 ? 0.9 : 0.22, { type: 'triangle', vol: 0.16, at: i * 0.14 })),
};
