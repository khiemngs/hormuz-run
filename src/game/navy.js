import * as THREE from 'three';
import { G } from './state.js';
import { scene } from '../core/engine.js';
import { TRACK, IRAN_OFF, IRAN_SEED } from '../config.js';
import { MODEL_MAT } from '../models/build.js';
import { destroyerGeometry, batteryGeometry } from '../models/navy.js';
import { laneHalf, landH, waveH, coastX } from '../world/geography.js';
import { rand, clamp, pick } from '../utils/math.js';
import { smoke, emitCount } from '../fx/effects.js';

const dummy = new THREE.Object3D();

function instanced(geometry, count) {
  const mesh = new THREE.InstancedMesh(geometry, MODEL_MAT, count);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  scene.add(mesh);
  return mesh;
}

// US destroyers sail beyond the starboard buoy line, pacing the player at fixed leads.
export const destroyers = [[-30, 4], [90, -2], [210, 6], [330, 0]].map(([offset, xoff]) => (
  { offset, xoff, x: 0, y: 0, z: 0, name: pick(['USS Vigilant', 'USS Resolute', 'USS Mercer', 'USS Halvorsen']) }
));
const destroyerMesh = instanced(destroyerGeometry(), destroyers.length);

// Iranian missile batteries are fixed along the port coast.
export const batteries = [];
for (let z = -150; z > -TRACK + 50; z -= 130) {
  const zz = z + rand(-30, 30), out = rand(12, 20);
  const x = -coastX(zz, IRAN_OFF, out), y = landH(out, zz, IRAN_SEED);
  batteries.push({ base: new THREE.Vector3(x, y, zz), pos: new THREE.Vector3(x + 2, y + 4, zz) });
}
const batteryMesh = instanced(batteryGeometry(), batteries.length);
batteries.forEach((b, i) => {
  dummy.position.copy(b.base);
  dummy.rotation.set(0, 0, 0);
  dummy.updateMatrix();
  batteryMesh.setMatrixAt(i, dummy.matrix);
});

export const gunPos = d => new THREE.Vector3(d.x, d.y + 3, d.z - 10);

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
    d.x = laneHalf(d.z) + 30 + d.xoff;
    d.y = waveH(d.x, d.z, G.time) * 0.3;
    dummy.position.set(d.x, d.y, d.z);
    dummy.rotation.set(Math.sin(G.time * 0.6 + i) * 0.01, 0, Math.sin(G.time * 0.8 + i) * 0.025);
    dummy.updateMatrix();
    destroyerMesh.setMatrixAt(i, dummy.matrix);
    if (emitCount(0.3)) smoke.spawn(d.x, 0.7, d.z + 15, rand(-1, 1), 0, 2, 0.93, 0.97, 1, 2, 2.5, 2, 0, 1, 0.7);
  });
  destroyerMesh.instanceMatrix.needsUpdate = true;
}
