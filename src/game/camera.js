import * as THREE from 'three';
import { G } from './state.js';
import { camera } from '../core/engine.js';
import { rand } from '../utils/math.js';
import { updatePointScale } from '../fx/effects.js';

const desired = new THREE.Vector3();
const lookAt = new THREE.Vector3();

// Slow orbit on the menu; chase cam behind the ship in play. Turbo widens the FOV.
export function updateCamera(dt) {
  const s = G.ship;
  lookAt.set(s.x, 4, s.z);
  if (G.mode === 'menu') {
    const a = G.time * 0.12;
    desired.set(s.x + Math.sin(a) * 75, 30, s.z + Math.cos(a) * 75);
  } else {
    const a = s.yaw * 0.6, back = 56 + s.speed * 0.6;
    desired.set(s.x + Math.sin(a) * back, 36 + s.speed * 0.3, s.z + Math.cos(a) * back);
    lookAt.x -= Math.sin(s.yaw) * 30;
    lookAt.z -= Math.cos(s.yaw) * 30;
  }

  camera.position.lerp(desired, 1 - Math.exp(-3 * dt));
  G.shake = Math.max(0, G.shake - dt * 2.5);
  const jolt = G.shake * G.shake;
  camera.position.x += rand(-1, 1) * jolt;
  camera.position.y += rand(-1, 1) * jolt;
  camera.lookAt(lookAt);

  const fov = 60 + (s.turbo > 0 ? 12 : 0);
  if (Math.abs(camera.fov - fov) > 0.05) {
    camera.fov += (fov - camera.fov) * Math.min(1, dt * 3);
    camera.updateProjectionMatrix();
    updatePointScale();
  }
}
