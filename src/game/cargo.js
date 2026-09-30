import * as THREE from 'three';
import { G } from './state.js';
import { scene } from '../core/engine.js';
import { CARGO_MAX } from '../config.js';
import { BAYS_Z, ROWS_X, TIERS, TIER_Y, CONTAINER_COLORS, CONTAINER_GEO, CONTAINER_MAT } from '../models/containerShip.js';
import { waveH } from '../world/geography.js';
import { rand, pick } from '../utils/math.js';
import { smoke } from '../fx/effects.js';

const DEBRIS_LIFETIME = 16;

// All 45 containers are one instanced mesh, stowed or overboard. Slot = instance index.
const mesh = new THREE.InstancedMesh(CONTAINER_GEO, CONTAINER_MAT, CARGO_MAX);
mesh.castShadow = true;
mesh.receiveShadow = true;
mesh.frustumCulled = false;
scene.add(mesh);

const stowed = [];                  // ship-local matrix per slot
const shipMatrix = new THREE.Matrix4();
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);
const m = new THREE.Matrix4(), dummy = new THREE.Object3D(), color = new THREE.Color();

// Restacks the ship. G.cargo lists stowed slots, ordered so pop() takes the top tier first.
export function resetCargo() {
  G.cargo = [];
  let slot = 0;
  for (let tier = 0; tier < TIERS; tier++) {
    const layer = [];
    for (const z of BAYS_Z) for (const x of ROWS_X) {
      stowed[slot] = new THREE.Matrix4().makeTranslation(x, TIER_Y(tier), z);
      mesh.setColorAt(slot, color.setHex(pick(CONTAINER_COLORS)));
      layer.push(slot++);
    }
    layer.sort(() => Math.random() - 0.5);
    G.cargo.push(...layer);
  }
  mesh.instanceColor.needsUpdate = true;
}

// Knocks containers off the top of the stack; they tumble into the sea as debris.
export function loseContainers(n) {
  for (let i = 0; i < n && G.cargo.length; i++) {
    const slot = G.cargo.pop();
    G.debris.push({
      slot, t: 0, floating: false,
      pos: new THREE.Vector3().setFromMatrixPosition(m.multiplyMatrices(shipMatrix, stowed[slot])),
      rot: new THREE.Euler(0, G.ship.yaw, 0),
      vel: new THREE.Vector3(rand(-9, 9), rand(6, 13), rand(-5, 5)),
      spin: new THREE.Vector3(rand(-2, 2), rand(-2, 2), rand(-2, 2)),
    });
  }
}

function updateDebris(dt) {
  for (let i = G.debris.length - 1; i >= 0; i--) {
    const d = G.debris[i], p = d.pos;
    d.t += dt;
    if (!d.floating) {
      d.vel.y -= 22 * dt;
      p.addScaledVector(d.vel, dt);
      d.rot.x += d.spin.x * dt;
      d.rot.y += d.spin.y * dt;
      d.rot.z += d.spin.z * dt;
      if (p.y < 0.5) {
        d.floating = true;
        for (let n = 0; n < 14; n++) smoke.spawn(p.x, 0.5, p.z, rand(-4, 4), rand(6, 14), rand(-4, 4), 0.92, 0.96, 1, 2, 1.2, 1, 22, 0.3);
      }
    } else {
      p.y += (waveH(p.x, p.z, G.time) * 0.6 - 0.5 - p.y) * Math.min(1, dt * 3);
      d.rot.x *= 1 - dt;
      d.rot.z *= 1 - dt;
    }

    if (d.t > DEBRIS_LIFETIME) {
      mesh.setMatrixAt(d.slot, HIDDEN);
      G.debris.splice(i, 1);
      continue;
    }
    dummy.position.copy(p);
    dummy.rotation.copy(d.rot);
    dummy.updateMatrix();
    mesh.setMatrixAt(d.slot, dummy.matrix);
  }
}

// Stowed containers ride the ship's matrix; debris follows its own physics.
export function updateCargo(dt, shipWorldMatrix) {
  shipMatrix.copy(shipWorldMatrix);
  for (const slot of G.cargo) mesh.setMatrixAt(slot, m.multiplyMatrices(shipMatrix, stowed[slot]));
  updateDebris(dt);
  mesh.instanceMatrix.needsUpdate = true;
}
