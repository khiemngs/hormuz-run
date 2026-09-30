import * as THREE from 'three';
import { G } from './state.js';
import { dyn } from '../core/engine.js';
import { createShockwave } from '../models/ordnance.js';
import { rand, pick } from '../utils/math.js';
import { fx, smoke } from '../fx/effects.js';
import { sfxFlare, sfxHorn } from '../audio/sfx.js';
import { toWorld, shipCenter, addScore } from './ship.js';
import { banner } from '../ui/hud.js';

const HORN_COOLDOWN = 7;
const HORN_RADIUS = 65;
const DECOY_CHANCE = 0.85;

// Fans five flares off the stern. Most homing missiles switch to chasing one.
export function deployFlares() {
  const s = G.ship;
  if (s.flares <= 0 || s.flareCd > 0) return;
  s.flares--;
  s.flareCd = 0.8;

  const c = Math.cos(s.yaw), sn = Math.sin(s.yaw);
  for (let i = 0; i < 5; i++) {
    const w = toWorld(rand(-4, 4), 20);
    const a = (i / 4 - 0.5) * 2.4, lvx = Math.sin(a) * 14, lvz = 8;
    G.flares.push({
      pos: new THREE.Vector3(w.x, 12, w.z),
      vel: new THREE.Vector3(lvx * c + lvz * sn, rand(10, 16), -lvx * sn + lvz * c),
      life: 3.5,
    });
  }

  let fooled = 0;
  for (const h of G.homings) {
    if (!h.target && Math.random() < DECOY_CHANCE) { h.target = pick(G.flares); fooled++; }
  }
  if (fooled) addScore(75 * fooled, 'DECOYED', shipCenter().setY(20), '#ffb13b');
  sfxFlare();
}

export function updateFlares(dt) {
  for (let i = G.flares.length - 1; i >= 0; i--) {
    const f = G.flares[i];
    f.life -= dt;
    f.vel.y -= 5 * dt;
    f.vel.multiplyScalar(1 - dt * 0.6);
    f.pos.addScaledVector(f.vel, dt);
    fx.spawn(f.pos.x, f.pos.y, f.pos.z, rand(-1, 1), rand(-1, 1), rand(-1, 1), 1, 0.85, 0.5, rand(2, 3.5), 0.3, -3);
    smoke.spawn(f.pos.x, f.pos.y, f.pos.z, 0, 0.5, 0, 0.85, 0.85, 0.85, 1.2, 1.4, 2, 0, 0.5, 0.4);
    if (f.life <= 0) {
      // Missiles keep flying to where the flare burned out.
      for (const h of G.homings) if (h.target === f) h.target = { pos: f.pos.clone() };
      G.flares.splice(i, 1);
    }
  }
}

// Ship horn. Sends nearby fast boats running.
export function horn() {
  const s = G.ship;
  if (s.hornCd > 0) return;
  s.hornCd = HORN_COOLDOWN;
  sfxHorn();
  banner('HOOOONK', '', 1, '#ffb13b');

  const ring = createShockwave();
  dyn.add(ring);
  G.shockwaves.push({ mesh: ring, t: 0 });

  const here = shipCenter().setY(0);
  for (const b of G.boats) {
    if (b.state === 'approach' && b.pos.distanceTo(here) < HORN_RADIUS) {
      b.state = 'flee';
      addScore(25, 'SCARED OFF', b.pos.clone().setY(5), '#fff0c0');
    }
  }
}

export function updateShockwaves(dt) {
  for (let i = G.shockwaves.length - 1; i >= 0; i--) {
    const w = G.shockwaves[i];
    w.t += dt;
    w.mesh.position.set(G.ship.x, 2.5, G.ship.z);
    w.mesh.scale.setScalar(6 + w.t * 80);
    w.mesh.material.opacity = Math.max(0, 0.8 - w.t);
    if (w.t > 0.8) {
      dyn.remove(w.mesh);
      G.shockwaves.splice(i, 1);
    }
  }
}
