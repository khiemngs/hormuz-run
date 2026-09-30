import { camera, sun } from '../core/engine.js';
import { SUN_DIR } from '../config.js';
import { createSky } from './sky.js';
import { createWater } from './water.js';
import { buildCoasts } from './coast.js';

const sky = createSky();
const water = createWater();
buildCoasts();

// Keeps sky, water and the shadow-casting sun centred on the player, and feeds
// the water shader the ship's pose for its wake.
export function updateWorld(time, ship) {
  sky.material.uniforms.uTime.value = time;
  sky.mesh.position.copy(camera.position);

  const u = water.material.uniforms;
  u.uTime.value = time;
  u.uShip.value.set(ship.x, ship.z, Math.cos(ship.yaw), Math.sin(ship.yaw));
  u.uSpeed.value = ship.speed;
  water.mesh.position.set(ship.x, 0, ship.z);

  sun.position.set(ship.x + SUN_DIR.x * 220, SUN_DIR.y * 220, ship.z + SUN_DIR.z * 220 - 20);
  sun.target.position.set(ship.x, 0, ship.z - 20);
}
