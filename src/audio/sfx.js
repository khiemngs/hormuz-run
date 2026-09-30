import { G } from '../game/state.js';
import { clamp } from '../utils/math.js';

// All sound is synthesized with WebAudio, so the game ships no audio files.
let ctx = null, master, noiseBuf, engineGain;

export function initAudio() {
  if (ctx) { ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 38;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 110;
  engineGain = ctx.createGain();
  engineGain.gain.value = 0;
  osc.connect(lp).connect(engineGain).connect(master);
  osc.start();
}

export function setEngineLevel(v) {
  if (engineGain) engineGain.gain.setTargetAtTime(v, ctx.currentTime, 0.2);
}

export function noise(dur, type, f0, f1, vol, q = 1) {
  if (!ctx) return;
  const t = ctx.currentTime, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf;
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random());
  src.stop(t + dur + 0.05);
}

export function tone(freq, dur, type = 'square', vol = 0.12, slide = freq) {
  if (!ctx) return;
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

// Quieter the farther a sound is from the player's ship.
export const distVol = p => clamp(1 - Math.hypot(p.x - G.ship.x, p.z - G.ship.z) / 500, 0.06, 1);

export const sfxBoom = (p, s = 1) => noise(1.3 * s, 'lowpass', 1400, 50, 0.9 * distVol(p) * s);
export const sfxLaunch = p => noise(0.7, 'bandpass', 300, 2400, 0.35 * distVol(p), 2);
export const sfxGunfire = p => noise(0.15, 'highpass', 3000, 1200, 0.2 * distVol(p));
export const sfxBeep = () => tone(1250, 0.08, 'square', 0.07);
export const sfxRadio = () => tone(2200, 0.05, 'square', 0.03);
export const sfxPickup = () => [660, 880, 1320].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'triangle', 0.15), i * 70));

export function sfxFlare() {
  tone(1400, 0.25, 'sawtooth', 0.08, 300);
  noise(0.4, 'highpass', 2000, 800, 0.3);
}

export function sfxHorn() {
  if (!ctx) return;
  const t = ctx.currentTime;
  for (const f of [73.4, 110, 146.8]) {
    const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = f;
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.25, t + 0.08);
    g.gain.setValueAtTime(0.25, t + 1.3);
    g.gain.linearRampToValueAtTime(0, t + 1.7);
    o.connect(lp).connect(g).connect(master);
    o.start(t);
    o.stop(t + 1.8);
  }
}
