import { G } from './state.js';
import { progressAt } from '../world/geography.js';
import { rand } from '../utils/math.js';
import { banner, radio } from '../ui/hud.js';
import { radioRandom } from './radioLines.js';
import { fireShell } from './threats/artillery.js';
import { launchCross, launchHoming } from './threats/missiles.js';
import { spawnBoats } from './threats/boats.js';

const INTRO_CALM = 7;

export function resetDirector() {
  G.dir = { shell: 3, cross: 5, ambient: 1, homing: 20, boat: 10, event: 28, evt: null, evtT: 0 };
}

// Attack rate multiplier. Ramps up toward the Narrows and eases off near the exit.
export function intensity() {
  const p = progressAt(G.ship.z);
  let k = 0.35 + 0.85 * Math.min(1, p / 0.55) - 0.25 * Math.max(0, (p - 0.8) / 0.2);
  if (G.dir.evt === 'ceasefire') k = 0;
  if (G.dir.evt === 'escalation') k *= 1.8;
  if (G.playTime < INTRO_CALM) k = 0;
  return k;
}

function rollEvent() {
  const d = G.dir, r = Math.random();
  if (r < 0.35) {
    d.evt = 'ceasefire';
    d.evtT = 6;
    banner('CEASEFIRE', 'six seconds of peace. probably.', 2.5, '#9fe0ff');
    radio('UN Observer', 'Both sides have agreed to a brief ceasefire. Move it!');
  } else if (r < 0.75) {
    d.evt = 'escalation';
    d.evtT = 8;
    banner('ESCALATION!', 'everyone is shooting everything', 2.5, '#ff4b3a');
    radioRandom();
  }
}

// Schedules every attack. Each timer drains faster as intensity rises.
export function updateDirector(dt) {
  const d = G.dir, p = progressAt(G.ship.z);

  if (d.evt && (d.evtT -= dt) <= 0) d.evt = null;
  if ((d.event -= dt) <= 0 && p < 0.95) {
    d.event = rand(22, 32);
    rollEvent();
  }

  // Background missiles far ahead, for atmosphere.
  if ((d.ambient -= dt) <= 0 && d.evt !== 'ceasefire' && G.playTime > 2) {
    d.ambient = rand(1, 2.5);
    launchCross(false);
  }

  const k = intensity();
  if (k <= 0) return;

  if ((d.shell -= dt * k) <= 0) {
    d.shell = rand(1.6, 3);
    fireShell();
    if (Math.random() < k * 0.35) fireShell();
  }
  if ((d.cross -= dt * k) <= 0) {
    d.cross = rand(3.5, 6);
    launchCross(true);
  }
  if (p > 0.15 && (d.homing -= dt * k) <= 0) {
    d.homing = rand(10, 16);
    launchHoming();
  }
  if (p > 0.07 && (d.boat -= dt * k) <= 0) {
    d.boat = rand(9, 15);
    spawnBoats(1 + (Math.random() < p ? 1 : 0));
  }
  if (Math.random() < dt * 0.04) radioRandom();
}
