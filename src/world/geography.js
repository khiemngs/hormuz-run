import { TRACK } from '../config.js';
import { clamp, smooth } from '../utils/math.js';

export const progressAt = z => clamp(-z / TRACK, 0, 1);

// Lane half-width narrows around the middle of the run (the Narrows).
export const laneHalf = z => 50 - 22 * Math.exp(-(((-z / TRACK) - 0.55) ** 2) / 0.02);

// Must match the vertex shader in water.js.
export const waveH = (x, z, t) =>
  Math.sin(x * 0.08 + t * 1.2) * 0.6 + Math.sin(z * 0.06 + t * 0.9) * 0.8 +
  Math.sin((x + z) * 0.15 + t * 2.0) * 0.25 + Math.sin(x * 0.31 - z * 0.23 + t * 2.7) * 0.12;

const hash = (x, z) => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Smooth value noise in 0..1.
export function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// Ridged fractal noise in 0..1: sharp crests, like eroded mountains.
function ridged(x, z) {
  let sum = 0, amp = 0.5, f = 1;
  for (let o = 0; o < 4; o++) {
    const n = 1 - Math.abs(2 * vnoise(x * f, z * f) - 1);
    sum += amp * n * n;
    f *= 2.1;
    amp *= 0.5;
  }
  return sum / 0.94;
}

// Terrain height at `out` units inland: a flat beach, then ridged mountains.
export const landH = (out, z, seed) =>
  -2.5 + smooth(0, 9, out) * 3.4 + smooth(5, 70, out) * (3 + 46 * ridged((out + seed * 7) * 0.018, z * 0.014 + seed));

// World x magnitude of a point `out` units inland, for a coast `offset` beyond the lane edge.
export const coastX = (z, offset, out) => laneHalf(z) + offset - 4 + out;
