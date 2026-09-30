import * as THREE from 'three';
import { scene, camera, renderer, boomLight } from '../core/engine.js';
import { Particles } from './Particles.js';
import { G } from '../game/state.js';
import { rand, clamp } from '../utils/math.js';
import { sfxBoom } from '../audio/sfx.js';

export const fx = new Particles(scene, 4000, true);     // fire, flashes, flares
export const smoke = new Particles(scene, 7000, false); // smoke, spray, wake

// Converts particle world size to pixels for the current viewport and FOV.
export function updatePointScale() {
  const h = renderer.getDrawingBufferSize(new THREE.Vector2()).y;
  const s = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  fx.mat.uniforms.uScale.value = s;
  smoke.mat.uniforms.uScale.value = s;
}

export function updateEffects(dt) {
  fx.update(dt);
  smoke.update(dt);
  boomLight.intensity *= Math.exp(-7 * dt);
}

export function clearEffects() {
  fx.clear();
  smoke.clear();
}

export function explode(p, s = 1, splash = true) {
  for (let i = 0; i < 26 * s; i++) {
    const a = Math.random() * Math.PI * 2, e = Math.random() * 1.2, v = rand(6, 16) * s;
    fx.spawn(p.x, p.y + 1, p.z, Math.cos(a) * Math.cos(e) * v, Math.sin(e) * v + 3, Math.sin(a) * Math.cos(e) * v,
      1, rand(0.35, 0.7), 0.12, rand(2.5, 5) * s, rand(0.35, 0.8), 6 * s, -2, 2.5);
  }
  for (let i = 0; i < 16 * s; i++) {
    const g = rand(0.16, 0.3);
    smoke.spawn(p.x + rand(-2, 2) * s, p.y + rand(0, 3), p.z + rand(-2, 2) * s, rand(-3, 3), rand(3, 7), rand(-3, 3),
      g, g * 0.95, g * 0.9, rand(3, 6) * s, rand(2, 3.5), 4 * s, -1.5, 0.6, 0.85);
  }
  if (splash) {
    for (let i = 0; i < 34 * s; i++) {
      const a = Math.random() * Math.PI * 2, r = rand(0, 3) * s;
      smoke.spawn(p.x + Math.cos(a) * r, 0.5, p.z + Math.sin(a) * r, Math.cos(a) * rand(1, 5), rand(14, 30) * s, Math.sin(a) * rand(1, 5),
        0.92, 0.96, 1, rand(1.5, 3) * s, rand(1.2, 1.8), 1.5, 26, 0.3);
    }
  }
  boomLight.position.set(p.x, p.y + 6, p.z);
  boomLight.intensity = Math.max(boomLight.intensity, 60 * s);
  sfxBoom(p, Math.min(1.4, s));
  const dist = Math.hypot(p.x - G.ship.x, p.z - G.ship.z);
  G.shake = Math.max(G.shake, clamp(1.6 * s - dist / 60, 0, 2.5));
}

export function muzzle(p, dirx = 0) {
  for (let i = 0; i < 10; i++) {
    fx.spawn(p.x, p.y, p.z, dirx * rand(4, 12) + rand(-2, 2), rand(0, 5), rand(-2, 2), 1, 0.7, 0.3, rand(1.5, 3), 0.25, 4);
  }
  for (let i = 0; i < 6; i++) {
    smoke.spawn(p.x, p.y, p.z, dirx * rand(2, 5), rand(1, 3), rand(-1, 1), 0.7, 0.68, 0.65, 2, 1.5, 3, -1, 0.5, 0.6);
  }
}

export function trail(p, big = 1) {
  fx.spawn(p.x, p.y, p.z, rand(-1, 1), rand(-1, 1), rand(-1, 1), 1, 0.6, 0.2, 1.4 * big, 0.15, 2);
  smoke.spawn(p.x, p.y, p.z, rand(-0.5, 0.5), rand(0, 1), rand(-0.5, 0.5), 0.8, 0.78, 0.75, 1.3 * big, 1.6, 2.5, -0.5, 0.4, 0.55);
}

// Firework burst for the victory screen.
export function firework(p, color) {
  for (let n = 0; n < 60; n++) {
    const a = Math.random() * Math.PI * 2, e = rand(-1.5, 1.5), v = rand(8, 18);
    fx.spawn(p.x, p.y, p.z, Math.cos(a) * Math.cos(e) * v, Math.sin(e) * v, Math.sin(a) * Math.cos(e) * v, ...color, 1.6, 1.6, 0, 6, 1);
  }
}
