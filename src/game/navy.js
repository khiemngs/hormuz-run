import * as THREE from 'three';
import { G } from './state.js';
import { scene } from '../core/engine.js';
import { TRACK, IRAN_OFF, IRAN_SEED } from '../config.js';
import { buildDestroyer, buildBattery } from '../models/navy.js';
import { laneHalf, landH, waveH, coastX } from '../world/geography.js';
import { rand, clamp, pick } from '../utils/math.js';
import { smoke, emitCount } from '../fx/effects.js';

// US destroyers sail beyond the starboard buoy line, pacing the player at fixed leads.
export const destroyers = [[-30, 4], [90, -2], [210, 6], [330, 0]].map(([offset, xoff]) => {
  const group = buildDestroyer();
  scene.add(group);
  return { group, offset, xoff, z: 0, name: pick(['USS Vigilant', 'USS Resolute', 'USS Mercer', 'USS Halvorsen']) };
});

// Iranian missile batteries are fixed along the port coast.
export const batteries = [];
for (let z = -150; z > -TRACK + 50; z -= 130) {
  const zz = z + rand(-30, 30), out = rand(12, 20);
  const group = buildBattery();
  const x = -coastX(zz, IRAN_OFF, out);
  group.position.set(x, landH(out, zz, IRAN_SEED), zz);
  scene.add(group);
  batteries.push({ group, pos: new THREE.Vector3(x + 2, group.position.y + 4, zz) });
}

export const gunPos = d => d.group.localToWorld(new THREE.Vector3(0, 3, -10));

export function nearest(list, z, getZ) {
  let best = null, bestD = Infinity;
  for (const o of list) {
    const d = Math.abs(getZ(o) - z);
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

export function resetNavy() {
  for (const d of destroyers) d.z = G.ship.z - d.offset;
}

export function updateNavy(dt) {
  destroyers.forEach((d, i) => {
    const target = G.ship.z - d.offset - Math.sin(G.time * 0.1 + i) * 30;
    d.z += clamp(target - d.z, -28 * dt, 28 * dt);
    const x = laneHalf(d.z) + 30 + d.xoff;
    d.group.position.set(x, waveH(x, d.z, G.time) * 0.3, d.z);
    d.group.rotation.z = Math.sin(G.time * 0.8 + i) * 0.02;
    if (emitCount(0.3)) smoke.spawn(x, 0.7, d.z + 14, rand(-1, 1), 0, 2, 0.93, 0.97, 1, 2, 2.5, 2, 0, 1, 0.7);
  });
}
