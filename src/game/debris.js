import { G } from './state.js';
import { dyn } from '../core/engine.js';
import { waveH } from '../world/geography.js';
import { rand } from '../utils/math.js';
import { smoke } from '../fx/effects.js';

const LIFETIME = 16;

// Containers knocked overboard tumble, splash down, then bob on the waves.
export function updateDebris(dt) {
  for (let i = G.debris.length - 1; i >= 0; i--) {
    const d = G.debris[i], m = d.mesh;
    d.t += dt;
    if (!d.floating) {
      d.vel.y -= 22 * dt;
      m.position.addScaledVector(d.vel, dt);
      m.rotation.x += d.spin.x * dt;
      m.rotation.y += d.spin.y * dt;
      m.rotation.z += d.spin.z * dt;
      if (m.position.y < 0.5) {
        d.floating = true;
        for (let n = 0; n < 14; n++) {
          smoke.spawn(m.position.x, 0.5, m.position.z, rand(-4, 4), rand(6, 14), rand(-4, 4), 0.92, 0.96, 1, 2, 1.2, 1, 22, 0.3);
        }
      }
    } else {
      m.position.y += (waveH(m.position.x, m.position.z, G.time) * 0.6 - 0.5 - m.position.y) * Math.min(1, dt * 3);
      m.rotation.x *= 1 - dt;
      m.rotation.z *= 1 - dt;
    }
    if (d.t > LIFETIME) {
      dyn.remove(m);
      G.debris.splice(i, 1);
    }
  }
}
