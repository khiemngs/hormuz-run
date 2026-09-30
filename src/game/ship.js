import * as THREE from 'three';
import { G } from './state.js';
import { scene } from '../core/engine.js';
import { TRACK } from '../config.js';
import { createContainerShip } from '../models/containerShip.js';
import { resetCargo, loseContainers, updateCargo } from './cargo.js';
import { laneHalf, waveH } from '../world/geography.js';
import { rand, clamp } from '../utils/math.js';
import { fx, smoke, emitCount } from '../fx/effects.js';
import { banner, radio, popup, flashVignette } from '../ui/hud.js';
import { fireShell } from './threats/artillery.js';
import { endRun, win } from './session.js';

const HALF_WIDTH = 4.5;
const HALF_LENGTH = 21.5;
const MAX_SPEED = 22;
const TURBO_BONUS = 16;

const model = createContainerShip();
scene.add(model.group);

export function resetShip() {
  Object.assign(G.ship, {
    x: 0, z: 40, yaw: 0, speed: 12, target: 12, rudder: 0, roll: 0, hp: 100, dist: 0,
    flares: 3, flareCd: 0, hornCd: 0, shield: 0, turbo: 0, groundCd: 0, zoneCd: 0, closeCd: 0,
  });
  resetCargo();
  model.group.position.set(0, 0, G.ship.z);
  model.group.rotation.set(0, 0, 0);
}

// Distance from a world point to the hull rectangle (0 when inside).
export function hullDist(x, z) {
  const s = G.ship, dx = x - s.x, dz = z - s.z, c = Math.cos(s.yaw), sn = Math.sin(s.yaw);
  const lx = dx * c - dz * sn, lz = dx * sn + dz * c;
  return Math.hypot(Math.max(Math.abs(lx) - HALF_WIDTH, 0), Math.max(Math.abs(lz) - HALF_LENGTH, 0));
}

// Converts ship-local (x right, z aft) coordinates to world x/z.
export function toWorld(lx, lz) {
  const s = G.ship, c = Math.cos(s.yaw), sn = Math.sin(s.yaw);
  return { x: s.x + lx * c + lz * sn, z: s.z - lx * sn + lz * c };
}

export const shipCenter = () => new THREE.Vector3(G.ship.x, 6, G.ship.z);

export function addScore(n, label, pos, color = '#ffe05a') {
  G.score += n;
  if (label) popup(`${label} +${n}`, pos, color);
}

export function damage(amount, label) {
  if (G.mode !== 'play') return;
  const s = G.ship;
  if (s.shield > 0) {
    popup('BLOCKED', shipCenter().setY(16), '#6fc3ff');
    return;
  }
  s.hp -= amount;
  G.stats.hits++;
  G.shake = Math.max(G.shake, 0.6 + amount * 0.05);
  flashVignette('rgba(255,30,0,0.55)', amount / 20);
  loseContainers(Math.max(1, Math.round(amount / 7)));
  if (label) popup(label, shipCenter().setY(18), '#ff6b5a');

  if (s.hp <= 0) {
    s.hp = 0;
    G.mode = 'sinking';
    G.sinkT = 0;
    banner('ABANDON SHIP', 'The strait claims another one', 4, '#ff4b3a');
    radio('Captain', 'Everybody off! Grab the cook!');
  }
}

function steer(dt) {
  const s = G.ship, k = G.keys;
  let input = 0;
  if (G.mode === 'play') {
    if (k.w) s.target = Math.min(MAX_SPEED, s.target + 10 * dt);
    if (k.s) s.target = Math.max(2, s.target - 12 * dt);
    input = (k.a ? 1 : 0) - (k.d ? 1 : 0);
  }

  // Heavy ship: rudder and speed both respond slowly.
  s.rudder += (input - s.rudder) * Math.min(1, dt * 1.8);
  const top = G.mode === 'sinking' ? 0 : s.target + (s.turbo > 0 ? TURBO_BONUS : 0);
  s.speed += clamp(top - s.speed, -6 * dt, 3 * dt * (s.turbo > 0 ? 4 : 1));
  s.yaw += s.rudder * 0.34 * (0.35 + s.speed / MAX_SPEED) * dt;
  if (Math.abs(input) < 0.1) s.yaw -= s.yaw * 0.25 * dt;
  s.yaw = clamp(s.yaw, -0.7, 0.7);
  s.x += -Math.sin(s.yaw) * s.speed * dt;
  s.z += -Math.cos(s.yaw) * s.speed * dt;
}

function enforceLane() {
  const s = G.ship, hw = laneHalf(s.z);

  if (s.x < -(hw - 5)) {
    s.x = -(hw - 5);
    s.yaw = -Math.abs(s.yaw) * 0.5;
    if (s.groundCd <= 0) {
      s.groundCd = 1.2;
      s.speed *= 0.6;
      damage(8, 'RAN AGROUND');
      radio('Chief Engineer', 'We\'re scraping the Iranian coast! That\'s not a parking spot!');
    }
  }

  if (s.x > hw - 4) {
    s.x = hw - 4;
    s.yaw = Math.abs(s.yaw) * 0.5;
    if (s.zoneCd <= 0 && G.mode === 'play') {
      s.zoneCd = 5;
      radio('USS Vigilant', 'Merchant vessel, you are entering the exclusion zone. Warning shots!');
      fireShell(true);
      fireShell(true);
    }
  }
}

function poseModel() {
  const s = G.ship;
  let y = waveH(s.x, s.z, G.time) * 0.3;
  let roll = s.roll + Math.sin(G.time * 0.7) * 0.015;
  let pitch = Math.sin(G.time * 0.55) * 0.01;
  if (G.mode === 'sinking') {
    y -= G.sinkT * G.sinkT * 0.5;
    roll += G.sinkT * 0.12;
    pitch -= G.sinkT * 0.04;
  }
  model.group.position.set(s.x, y, s.z);
  model.group.rotation.set(pitch, s.yaw, roll);

  model.shield.visible = s.shield > 0;
  if (model.shield.visible) model.shield.material.opacity = 0.14 + Math.sin(G.time * 10) * 0.06 * (s.shield < 1.5 ? 2 : 1);
}

// Spray at the bow and churn at the stern. The flat foam wake is drawn by the water shader.
function emitWake() {
  const s = G.ship, c = Math.cos(s.yaw), sn = Math.sin(s.yaw);
  const n = emitCount(s.speed / 12 + (s.turbo > 0 ? 3 : 0));
  for (let i = 0; i < n; i++) {
    const side = Math.random() < 0.5 ? -1 : 1, out = side * rand(2, 5);
    const stern = toWorld(side * rand(0.5, 3), 21), bow = toWorld(side * rand(1, 2.5), -21);
    smoke.spawn(stern.x, 0.8, stern.z, out * c * 0.5, rand(0.5, 2), -out * sn * 0.5, 0.92, 0.96, 1, rand(1, 1.8), rand(1, 1.8), 1.4, 3, 1.2, 0.4);
    smoke.spawn(bow.x, 1, bow.z, out * c * 1.5, rand(1, 4), -out * sn * 1.5, 0.95, 0.98, 1, rand(0.8, 1.6), 1.2, 1.2, 6, 1, 0.5);
  }
  if (s.turbo > 0 && emitCount()) {
    const st = toWorld(rand(-3, 3), 22);
    fx.spawn(st.x, 1.5, st.z, 0, 1, 0, 1, 0.3, 0.9, 3, 0.4, 3);
  }
}

// Smoke, then fire, as the hull takes damage.
function emitDamage() {
  const s = G.ship;
  if (s.hp >= 70 || !emitCount(Math.min(1, (70 - s.hp) / 40))) return;
  const p = toWorld(rand(-3.5, 3.5), rand(-15, 15)), g = rand(0.1, 0.2);
  smoke.spawn(p.x, 8, p.z, rand(-1, 1), rand(4, 7), rand(-1, 1), g, g, g, 3, 3, 3, -0.5, 0.2, 0.8);
  if (s.hp < 40) fx.spawn(p.x, 7, p.z, 0, rand(2, 5), 0, 1, 0.45, 0.1, rand(2, 3.5), 0.5, 1);
}

export function updateShip(dt) {
  const s = G.ship;
  steer(dt);
  enforceLane();
  for (const k of ['groundCd', 'zoneCd', 'closeCd', 'hornCd', 'flareCd', 'turbo', 'shield']) s[k] = Math.max(0, s[k] - dt);
  s.roll += (-s.rudder * 0.06 * (s.speed / MAX_SPEED) - s.roll) * dt * 2;
  s.dist = Math.max(s.dist, -s.z);
  if (G.mode === 'sinking') G.sinkT += dt;

  poseModel();
  model.group.updateMatrixWorld();
  updateCargo(dt, model.group.matrixWorld);
  emitWake();
  emitDamage();

  if (G.mode === 'sinking' && G.sinkT > 4.5) endRun(false);
  if (G.mode === 'play' && s.z <= -TRACK) win();
}
