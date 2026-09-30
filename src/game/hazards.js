import * as THREE from 'three';
import { G } from './state.js';
import { scene, dyn } from '../core/engine.js';
import { TRACK } from '../config.js';
import { MODEL_MAT } from '../models/build.js';
import { mineGeometry, MINE_LIGHT_GEO, MINE_LIGHT_MAT, buildPickup, setMineBlink, PICKUPS, PICKUP_WEIGHTS } from '../models/props.js';
import { laneHalf, waveH } from '../world/geography.js';
import { rand, weightedPick } from '../utils/math.js';
import { explode } from '../fx/effects.js';
import { sfxPickup } from '../audio/sfx.js';
import { hullDist, damage } from './ship.js';
import { popup, radio, flashVignette } from '../ui/hud.js';

const DRAW_RANGE = 800;
const MAX_MINES = 120;

// Mines are two instanced meshes (body, light). Each frame only those in range are drawn.
const mineMesh = new THREE.InstancedMesh(mineGeometry(), MODEL_MAT, MAX_MINES);
const lightMesh = new THREE.InstancedMesh(MINE_LIGHT_GEO, MINE_LIGHT_MAT, MAX_MINES);
for (const mesh of [mineMesh, lightMesh]) {
  mesh.frustumCulled = false;
  mesh.count = 0;
  scene.add(mesh);
}
const dummy = new THREE.Object3D();

// Scatters mines (densest in the Narrows) and pickups along the whole route.
export function populateTrack() {
  for (let z = -260; z > -TRACK + 80 && G.mines.length < MAX_MINES;) {
    const hw = laneHalf(z);
    G.mines.push({ pos: new THREE.Vector3(rand(-hw + 6, hw - 6), 0, z), phase: Math.random() * 6 });
    z -= rand(30, 70) / (0.5 + Math.exp(-(((-z / TRACK) - 0.55) ** 2) / 0.04));
  }

  for (let z = -140; z > -TRACK + 60; z -= rand(95, 145)) {
    const hw = laneHalf(z), type = weightedPick(PICKUP_WEIGHTS);
    const pos = new THREE.Vector3(rand(-hw + 10, hw - 10), 0, z);
    const mesh = buildPickup(type);
    mesh.position.copy(pos);
    dyn.add(mesh);
    G.pickups.push({ mesh, pos, type, phase: Math.random() * 6 });
  }
}

function applyPickup(type, pos) {
  const P = PICKUPS[type], s = G.ship;
  sfxPickup();
  popup(P.label, pos, P.css);
  flashVignette(`${P.css}88`, 0.5);
  switch (type) {
    case 'repair': s.hp = Math.min(100, s.hp + 30); break;
    case 'flare': s.flares += 2; break;
    case 'gold': G.score += 300; break;
    case 'shield':
      s.shield = 7;
      radio('Captain', 'Raise the neutral flag! Nobody shoots a ship this polite.');
      break;
    case 'turbo':
      s.turbo = 5;
      radio('Chief Engineer', 'Overriding the governor! She\'s gonna blow... fast!');
      break;
  }
}

export function updateMines(dt) {
  setMineBlink(Math.sin(G.time * 6) > 0);
  let shown = 0;
  for (let i = G.mines.length - 1; i >= 0; i--) {
    const m = G.mines[i];
    if (Math.abs(m.pos.z - G.ship.z) > DRAW_RANGE) continue;
    m.pos.x += Math.sin(G.time * 0.3 + m.phase) * 0.6 * dt;
    if (G.mode === 'play' && hullDist(m.pos.x, m.pos.z) < 1.3) {
      explode(m.pos, 1.4);
      damage(20, 'MINE!');
      G.mines.splice(i, 1);
      continue;
    }
    dummy.position.set(m.pos.x, waveH(m.pos.x, m.pos.z, G.time) * 0.8 - 0.1, m.pos.z);
    dummy.rotation.set(Math.sin(G.time + m.phase) * 0.2, G.time * 0.2 + m.phase, 0);
    dummy.updateMatrix();
    mineMesh.setMatrixAt(shown, dummy.matrix);
    lightMesh.setMatrixAt(shown, dummy.matrix);
    shown++;
  }
  mineMesh.count = lightMesh.count = shown;
  mineMesh.instanceMatrix.needsUpdate = lightMesh.instanceMatrix.needsUpdate = true;
}

export function updatePickups() {
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const p = G.pickups[i];
    p.mesh.visible = Math.abs(p.pos.z - G.ship.z) < DRAW_RANGE;
    if (!p.mesh.visible) continue;
    p.mesh.position.set(p.pos.x, waveH(p.pos.x, p.pos.z, G.time) * 0.7 + 1 + Math.sin(G.time * 2 + p.phase) * 0.4, p.pos.z);
    p.mesh.rotation.y = G.time * 1.5 + p.phase;
    if (G.mode === 'play' && hullDist(p.pos.x, p.pos.z) < 2.5) {
      applyPickup(p.type, p.pos.clone().setY(10));
      dyn.remove(p.mesh);
      G.pickups.splice(i, 1);
    }
  }
}
