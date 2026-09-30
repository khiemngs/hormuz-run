import * as THREE from 'three';
import { G } from '../state.js';
import { dyn } from '../../core/engine.js';
import { destroyers, batteries, gunPos, nearest } from '../navy.js';
import { buildMissile, createWarnLane } from '../../models/ordnance.js';
import { rand } from '../../utils/math.js';
import { explode, muzzle, trail } from '../../fx/effects.js';
import { sfxLaunch, sfxBeep } from '../../audio/sfx.js';
import { hullDist, damage, addScore, shipCenter } from '../ship.js';
import { radio } from '../../ui/hud.js';

const CROSS_SPEED = 115;
const WARN_TIME = 2.4;
const HOMING_SPEED = 46;

const arcPoint = (c, k) => {
  const p = new THREE.Vector3().lerpVectors(c.from, c.to, Math.min(1, k));
  p.y += Math.sin(Math.PI * Math.min(1, k)) * 5;
  return p;
};

// Fires a missile across the strait, US side to Iranian side or back.
// Warned shots flash a chevron lane first and aim near the ship's path.
export function launchCross(warned) {
  const s = G.ship;
  const delay = warned ? WARN_TIME : 0.3;
  const zc = warned ? s.z - s.speed * (delay + 0.6) - rand(-10, 70) : s.z - rand(260, 560);
  const d = nearest(destroyers, zc, o => o.z), b = nearest(batteries, zc, o => o.pos.z);
  if (!d || !b) return;

  const usPos = gunPos(d).setY(6), irPos = b.pos.clone().setY(b.pos.y + 1);
  usPos.z = zc + rand(-25, 25);
  const fromUS = Math.random() < 0.5;
  const from = fromUS ? usPos : irPos, to = fromUS ? irPos : usPos;

  const lane = warned ? createWarnLane(from, to) : null;
  if (lane) dyn.add(lane);
  const mesh = buildMissile();
  mesh.visible = false;
  dyn.add(mesh);
  G.crosses.push({ from, to, t: 0, delay, dur: from.distanceTo(to) / CROSS_SPEED, mesh, lane, warned, minD: Infinity, fromUS });
}

export function updateCrossfire(dt) {
  for (let i = G.crosses.length - 1; i >= 0; i--) {
    const c = G.crosses[i];
    c.t += dt;
    if (c.t < c.delay) {
      if (c.lane) c.lane.material.opacity = 0.35 + 0.5 * Math.abs(Math.sin(c.t * (4 + (c.t / c.delay) * 14)));
      continue;
    }
    if (!c.mesh.visible) {
      c.mesh.visible = true;
      muzzle(c.from, c.fromUS ? -1 : 1);
      sfxLaunch(c.from);
    }

    const k = (c.t - c.delay) / c.dur;
    const p = arcPoint(c, k);
    c.mesh.position.copy(p);
    c.mesh.lookAt(arcPoint(c, k + 0.02));
    trail(p);
    trail(p);

    const d = hullDist(p.x, p.z);
    c.minD = Math.min(c.minD, d);
    let done = false;
    if (d < 1.8 && G.mode === 'play') {
      explode(p, 1.3, false);
      damage(22, 'DIRECT HIT');
      done = true;
    } else if (k >= 1) {
      explode(c.to, 1.2, false);
      if (c.warned && c.minD < 16 && G.mode === 'play') {
        G.stats.needles++;
        addScore(100, 'THREADED THE NEEDLE', shipCenter().setY(22), '#9fe0ff');
      }
      done = true;
    }

    if (done) {
      if (c.lane) dyn.remove(c.lane);
      dyn.remove(c.mesh);
      G.crosses.splice(i, 1);
    } else if (c.lane) {
      c.lane.material.opacity = Math.max(0, c.lane.material.opacity - dt * 1.5);
    }
  }
}

// Launches a missile that chases the ship. Flares can decoy it.
export function launchHoming() {
  const zc = G.ship.z - rand(90, 200);
  const fromUS = Math.random() < 0.45;
  const pos = fromUS ? gunPos(nearest(destroyers, zc, o => o.z)).setY(6) : nearest(batteries, zc, o => o.pos.z).pos.clone();
  const mesh = buildMissile();
  mesh.scale.setScalar(1.3);
  dyn.add(mesh);
  const dir = shipCenter().sub(pos).normalize().add(new THREE.Vector3(0, 0.8, 0)).normalize();
  G.homings.push({
    pos, dir, mesh, fromUS, target: null, life: 9, age: 0,
    interceptAt: Math.random() < 0.25 ? rand(1.5, 3) : -1,
  });
  muzzle(pos, fromUS ? -1 : 1);
  sfxLaunch(pos);
  radio(...(fromUS
    ? ['USS Resolute', 'Uh... that one might have locked onto the wrong ship. Sorry!']
    : ['IRGC Command', 'Target the big container ship!']));
}

let beepT = 0;

export function updateHoming(dt) {
  let locked = false;
  for (let i = G.homings.length - 1; i >= 0; i--) {
    const h = G.homings[i];
    h.life -= dt;
    h.age += dt;
    if (!h.target) locked = true;

    const want = (h.target ? h.target.pos : shipCenter()).clone().sub(h.pos).normalize();
    h.dir.lerp(want, Math.min(1, (h.age < 0.8 ? 0.6 : 1.9) * dt)).normalize();
    h.pos.addScaledVector(h.dir, HOMING_SPEED * dt);
    h.pos.y = Math.max(h.pos.y, 2);
    h.mesh.position.copy(h.pos);
    h.mesh.lookAt(h.pos.clone().add(h.dir));
    trail(h.pos, 1.3);
    trail(h.pos, 1.3);

    let done = true;
    if (h.interceptAt > 0 && h.age > h.interceptAt) {
      explode(h.pos, 0.8, false);
      radio(...(h.fromUS
        ? ['IRGC Battery', 'We shot down the Americans\' missile! ...you\'re welcome, ship.']
        : ['USS Mercer', 'Splash one! You owe us a coffee, merchant.']));
      addScore(50, 'INTERCEPTED', h.pos, '#9fe0ff');
    } else if (!h.target && hullDist(h.pos.x, h.pos.z) < 1.5 && h.pos.y < 16) {
      explode(h.pos, 1.5, false);
      damage(25, 'MISSILE HIT');
    } else if (h.target && h.pos.distanceTo(h.target.pos) < 3) {
      explode(h.pos, 0.9, false);
    } else if (h.life <= 0) {
      explode(h.pos, 0.7, h.pos.y < 3);
    } else {
      done = false;
    }
    if (done) {
      dyn.remove(h.mesh);
      G.homings.splice(i, 1);
    }
  }

  G.lockedOn = locked && G.mode === 'play';
  if (G.lockedOn && (beepT -= dt) <= 0) {
    beepT = 0.35;
    sfxBeep();
  }
}
