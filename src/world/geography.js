import { TRACK } from '../config.js';
import { clamp, smooth } from '../utils/math.js';

export const progressAt = z => clamp(-z / TRACK, 0, 1);

// Lane half-width narrows around the middle of the run (the Narrows).
export const laneHalf = z => 50 - 22 * Math.exp(-(((-z / TRACK) - 0.55) ** 2) / 0.02);

// Must match the vertex shader in water.js.
export const waveH = (x, z, t) =>
  Math.sin(x * 0.08 + t * 1.2) * 0.6 + Math.sin(z * 0.06 + t * 0.9) * 0.8 +
  Math.sin((x + z) * 0.15 + t * 2.0) * 0.25 + Math.sin(x * 0.31 - z * 0.23 + t * 2.7) * 0.12;

const fbm = (x, z) => (
  Math.sin(x * 0.045 + 1.3) * Math.cos(z * 0.031) +
  0.5 * Math.sin(x * 0.11 + z * 0.083 + 2.1) +
  0.25 * Math.sin(z * 0.19 - x * 0.15) +
  0.125 * Math.sin(x * 0.37 + z * 0.29)
) / 1.875 * 0.5 + 0.5;

// Terrain height at `out` units inland from the shoreline.
export const landH = (out, z, seed) => -2.5 + smooth(0, 28, out) * (5 + 28 * fbm(out * 1.3 + seed, z));

// World x magnitude of a point `out` units inland, for a coast `offset` beyond the lane edge.
export const coastX = (z, offset, out) => laneHalf(z) + offset - 4 + out;
