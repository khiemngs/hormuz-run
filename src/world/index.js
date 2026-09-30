import { camera, sun } from '../core/engine.js';
import { SUN_DIR } from '../config.js';
import { createSky } from './sky.js';
import { createWater } from './water.js';
import { buildCoasts } from './coast.js';

const sky = createSky();
const water = createWater();
buildCoasts();

// Keeps sky, water and the shadow-casting sun centred on the player.
export function updateWorld(time, focus) {
  water.material.uniforms.uTime.value = time;
  sky.position.copy(camera.position);
  water.mesh.position.set(Math.round(focus.x / 10) * 10, 0, Math.round(focus.z / 10) * 10 - 300);
  sun.position.set(focus.x + SUN_DIR.x * 220, SUN_DIR.y * 220, focus.z + SUN_DIR.z * 220 - 20);
  sun.target.position.set(focus.x, 0, focus.z - 20);
}
