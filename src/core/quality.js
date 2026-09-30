import { renderer } from './engine.js';
import { IS_TOUCH } from '../config.js';

const MAX_RATIO = renderer.getPixelRatio();
const MIN_RATIO = IS_TOUCH ? 0.75 : 1;
const LOW_FPS = 50;    // below this, render fewer pixels
const HIGH_FPS = 100;  // above this there is headroom to sharpen again
const WINDOW = 1;      // seconds averaged per decision

let frames = 0, acc = 0;
const listeners = [];
export const onQualityChange = fn => listeners.push(fn);

function setRatio(r) {
  renderer.setPixelRatio(Math.round(r * 100) / 100);
  listeners.forEach(fn => fn());
}

/**
 * Dynamic resolution. Frame cost here is dominated by pixel count, so when the
 * frame rate sags the render resolution steps down, and steps back up once there is
 * clear headroom. The gap between the two thresholds stops it from oscillating.
 * Vsynced touch devices can never show headroom, so they only step down.
 */
export function updateQuality(realDt) {
  if (realDt > 0.25 || document.hidden) { frames = acc = 0; return; } // tab switch or stall, not a real sample
  frames++;
  acc += realDt;
  if (acc < WINDOW) return;

  const fps = frames / acc, ratio = renderer.getPixelRatio();
  frames = acc = 0;
  if (fps < LOW_FPS && ratio > MIN_RATIO) setRatio(Math.max(MIN_RATIO, ratio - 0.2));
  else if (!IS_TOUCH && fps > HIGH_FPS && ratio < MAX_RATIO) setRatio(Math.min(MAX_RATIO, ratio + 0.1));
}
