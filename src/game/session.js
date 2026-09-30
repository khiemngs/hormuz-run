import * as THREE from 'three';
import { G, resetState } from './state.js';
import { dyn } from '../core/engine.js';
import { TRACK, CARGO_MAX } from '../config.js';
import { rand } from '../utils/math.js';
import { loadBest, saveBest } from '../utils/storage.js';
import { initAudio, tone } from '../audio/sfx.js';
import { clearEffects, firework } from '../fx/effects.js';
import { resetShip } from './ship.js';
import { resetNavy } from './navy.js';
import { resetDirector } from './director.js';
import { populateTrack } from './hazards.js';
import { banner, radio, clearHud } from '../ui/hud.js';
import { showEndScreen, hideScreen } from '../ui/screens.js';

// Wipes every run-scoped object and rebuilds the route.
export function reset() {
  dyn.clear();
  clearHud();
  clearEffects();
  resetState();
  resetShip();
  resetNavy();
  resetDirector();
  populateTrack();
}

export function start() {
  initAudio();
  reset();
  G.mode = 'play';
  hideScreen();
  banner('ENTERING THE STRAIT', 'Persian Gulf → Gulf of Oman', 3);
  radio('Captain', 'Entering the Strait of Hormuz. Both navies are... busy today.');
  radio('Ship Owner', 'Deliver the cargo. ALL of it. Please.');
}

export function win() {
  G.mode = 'win';
  banner('SAFE WATERS!', 'cargo delivered', 3, '#4be37a');
  radio('Ship Owner', 'You actually made it?! Drinks are on me. Well, on insurance.');
  for (let i = 0; i < 12; i++) {
    setTimeout(() => {
      const s = G.ship;
      firework(new THREE.Vector3(s.x + rand(-40, 40), rand(30, 60), s.z - rand(20, 90)), [rand(0.4, 1), rand(0.4, 1), rand(0.4, 1)]);
      tone(rand(300, 600), 0.4, 'triangle', 0.1, 80);
    }, i * 300);
  }
  setTimeout(() => endRun(true), 3500);
}

export function endRun(won) {
  if (G.mode === 'dead' || G.mode === 'over') return;
  const s = G.ship;
  const cargoBonus = won ? G.cargo.length * 100 : 0;
  const hullBonus = won ? Math.round(s.hp) * 20 : 0;
  const total = Math.floor(G.score + s.dist) + cargoBonus + hullBonus;
  saveBest(total);
  G.mode = won ? 'over' : 'dead';

  showEndScreen({
    won, total, cargoBonus, hullBonus,
    best: loadBest(),
    distNm: s.dist / 100,
    remainingNm: (TRACK - s.dist) / 100,
    cargo: G.cargo.length,
    cargoMax: CARGO_MAX,
    stats: G.stats,
  }, start);
}
