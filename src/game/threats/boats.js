import * as THREE from 'three';
import { G } from '../state.js';
import { dyn } from '../../core/engine.js';
import { buildFastBoat } from '../../models/navy.js';
import { BULLET_GEO, BULLET_MAT } from '../../models/ordnance.js';
import { laneHalf, waveH } from '../../world/geography.js';
import { rand, clamp } from '../../utils/math.js';
import { explode, muzzle, fx, smoke } from '../../fx/effects.js';
import { sfxGunfire } from '../../audio/sfx.js';
import { hullDist, toWorld, damage, addScore } from '../ship.js';
import { radio } from '../../ui/hud.js';

const MAX_BOATS = 5;
const BULLET_SPEED = 120;

// IRGC fast boats launch from the port coast and take station beside the ship.
export function spawnBoats(n) {
  for (let i = 0; i < n && G.boats.length < MAX_BOATS; i++) {
    const z = G.ship.z - rand(60, 220);
    const mesh = buildFastBoat();
    dyn.add(mesh);
    G.boats.push({
      mesh, pos: new THREE.Vector3(-(laneHalf(z) + 2), 0, z), yaw: -Math.PI / 2, speed: 10, state: 'approach',
      fireCd: rand(2, 3), lx: (Math.random() < 0.75 ? -1 : 1) * rand(14, 24), lz: rand(-18, 18), life: 35,
    });
  }
  radio('IRGC Fast Boats', 'Intercept the container ship! Swarm it!');
}

function fireBurst(b) {
  const from = b.pos.clone().setY(1.6);
  const w = toWorld(rand(-3.5, 3.5), rand(-16, 16));
  const to = new THREE.Vector3(w.x + rand(-1.5, 1.5), rand(3, 8), w.z + rand(-1.5, 1.5));
  for (let n = 0; n < 3; n++) {
    const vel = to.clone().sub(from).normalize().multiplyScalar(BULLET_SPEED);
    vel.x += rand(-4, 4);
    vel.y += rand(-2, 2);
    const mesh = new THREE.Mesh(BULLET_GEO, BULLET_MAT);
    const start = from.clone().addScaledVector(vel, -n * 0.012);
    mesh.position.copy(start);
    mesh.lookAt(start.clone().add(vel));
    dyn.add(mesh);
    G.bullets.push({ mesh, vel, life: 0.8 });
  }
  muzzle(from, 0);
  sfxGunfire(from);
}

function removeBoat(i) {
  dyn.remove(G.boats[i].mesh);
  G.boats.splice(i, 1);
}

export function updateBoats(dt) {
  const s = G.ship;
  for (let i = G.boats.length - 1; i >= 0; i--) {
    const b = G.boats[i];
    b.life -= dt;
    if (b.life <= 0 || G.mode !== 'play') b.state = 'flee';
    const hw = laneHalf(b.pos.z);

    let tx, tz, speed;
    if (b.state === 'approach') {
      ({ x: tx, z: tz } = toWorld(b.lx, b.lz));
      speed = clamp(Math.hypot(tx - b.pos.x, tz - b.pos.z) * 1.5, s.speed, s.speed + 18);
    } else {
      tx = -(hw + 40);
      tz = b.pos.z - 30;
      speed = 34;
    }
    const want = Math.atan2(-(tx - b.pos.x), -(tz - b.pos.z));
    const turn = Math.atan2(Math.sin(want - b.yaw), Math.cos(want - b.yaw));
    b.yaw += clamp(turn, -2.6 * dt, 2.6 * dt);
    b.speed += (speed - b.speed) * Math.min(1, dt * 2);
    b.pos.x += -Math.sin(b.yaw) * b.speed * dt;
    b.pos.z += -Math.cos(b.yaw) * b.speed * dt;
    b.mesh.position.set(b.pos.x, waveH(b.pos.x, b.pos.z, G.time) * 0.6 + 0.2, b.pos.z);
    b.mesh.rotation.set(-0.08, b.yaw, Math.sin(G.time * 3 + i) * 0.08);
    if (Math.random() < 0.8) {
      smoke.spawn(b.pos.x + Math.sin(b.yaw) * 3, 0.7, b.pos.z + Math.cos(b.yaw) * 3, rand(-1, 1), 0, rand(-1, 1), 0.93, 0.97, 1, 1.4, 1.6, 2, 0, 1, 0.8);
    }

    const d = hullDist(b.pos.x, b.pos.z);
    if (d < 0.8 && G.mode === 'play') {
      explode(b.pos, 0.8);
      G.stats.rammed++;
      addScore(150, 'RAMMED!', b.pos.clone().setY(6), '#ff9f43');
      removeBoat(i);
      continue;
    }
    if (b.state === 'approach' && d < 30 && (b.fireCd -= dt) <= 0) {
      b.fireCd = rand(1.1, 1.9);
      fireBurst(b);
    }
    const escaped = b.state === 'flee' && (b.pos.x < -(hw + 30) || Math.abs(b.pos.z - s.z) > 300);
    if (escaped || b.pos.z > s.z + 200) removeBoat(i);
  }
}

export function updateBullets(dt) {
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    b.life -= dt;
    b.mesh.position.addScaledVector(b.vel, dt);
    const p = b.mesh.position;
    if (p.y < 13 && hullDist(p.x, p.z) < 0.3) {
      for (let n = 0; n < 5; n++) fx.spawn(p.x, p.y, p.z, rand(-6, 6), rand(0, 6), rand(-6, 6), 1, 0.9, 0.5, 0.8, 0.2);
      damage(1.5);
      b.life = 0;
    }
    if (b.life <= 0) {
      dyn.remove(b.mesh);
      G.bullets.splice(i, 1);
    }
  }
}
