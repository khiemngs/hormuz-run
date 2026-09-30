import * as THREE from 'three';
import { G } from '../state.js';
import { dyn } from '../../core/engine.js';
import { destroyers, batteries, gunPos } from '../navy.js';
import { SHELL_GEO, SHELL_MAT, createImpactMarker } from '../../models/ordnance.js';
import { laneHalf, waveH } from '../../world/geography.js';
import { rand, clamp, pick } from '../../utils/math.js';
import { explode, muzzle, trail } from '../../fx/effects.js';
import { sfxBoom } from '../../audio/sfx.js';
import { hullDist, damage, addScore } from '../ship.js';

const BLAST_RADIUS = 5.5;
const CLOSE_CALL_RADIUS = 15;

function shooters() {
  const list = [];
  for (const d of destroyers) if (Math.abs(d.z - G.ship.z) < 320) list.push({ pos: gunPos(d), side: 1 });
  for (const b of batteries) if (b.pos.z < G.ship.z + 80 && b.pos.z > G.ship.z - 340) list.push({ pos: b.pos.clone(), side: -1 });
  return list;
}

// Lobs a shell at where the ship will be. A red ring marks the impact point.
export function fireShell(forceAim = false) {
  const list = shooters();
  if (!list.length) return;
  const s = G.ship, shooter = pick(list);
  const dur = rand(1.8, 2.5), lead = s.speed * dur;
  const aimed = forceAim || Math.random() < 0.6;
  const px = s.x - Math.sin(s.yaw) * lead, pz = s.z - Math.cos(s.yaw) * lead;
  const to = new THREE.Vector3(px + (aimed ? rand(-9, 9) : rand(-30, 30)), 0.5, pz + (aimed ? rand(-14, 14) : rand(-40, 40)));
  const hw = laneHalf(to.z);
  to.x = clamp(to.x, -hw - 4, hw + 4);

  const marker = createImpactMarker();
  marker.group.position.set(to.x, 2, to.z);
  const mesh = new THREE.Mesh(SHELL_GEO, SHELL_MAT);
  dyn.add(marker.group, mesh);
  G.shells.push({ from: shooter.pos.clone(), to, t: 0, dur, marker, mesh, arc: 18 + shooter.pos.distanceTo(to) * 0.25 });
  muzzle(shooter.pos, -shooter.side);
  sfxBoom(shooter.pos, 0.35);
}

export function updateShells(dt) {
  for (let i = G.shells.length - 1; i >= 0; i--) {
    const s = G.shells[i];
    s.t += dt;
    const k = Math.min(1, s.t / s.dur);
    s.mesh.position.lerpVectors(s.from, s.to, k);
    s.mesh.position.y += s.arc * 4 * k * (1 - k);
    s.marker.fill.scale.setScalar(Math.max(0.01, k));
    s.marker.group.position.y = 2 + waveH(s.to.x, s.to.z, G.time) * 0.3;
    trail(s.mesh.position, 0.8);
    if (k < 1) continue;

    explode(s.to, 1);
    const d = hullDist(s.to.x, s.to.z);
    if (d < BLAST_RADIUS) damage(14, 'SHELL HIT');
    else if (d < CLOSE_CALL_RADIUS && G.mode === 'play' && G.ship.closeCd <= 0) {
      G.ship.closeCd = 1;
      G.stats.closeCalls++;
      addScore(50, 'CLOSE CALL', s.to.clone().setY(8));
    }
    dyn.remove(s.marker.group, s.mesh);
    G.shells.splice(i, 1);
  }
}
