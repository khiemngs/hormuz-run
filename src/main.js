import './styles/main.css';
import { renderer, scene, camera, onResize } from './core/engine.js';
import { updateWorld } from './world/index.js';
import { G } from './game/state.js';
import { updateShip } from './game/ship.js';
import { updateNavy } from './game/navy.js';
import { updateThreats } from './game/threats/index.js';
import { updateMines, updatePickups } from './game/hazards.js';
import { deployFlares, updateFlares, horn, updateShockwaves } from './game/abilities.js';
import { updateDebris } from './game/debris.js';
import { updateDirector } from './game/director.js';
import { updateCamera } from './game/camera.js';
import { reset, start } from './game/session.js';
import { updateEffects, updatePointScale } from './fx/effects.js';
import { setEngineLevel, isMuted, setMuted } from './audio/sfx.js';
import { $ } from './utils/dom.js';
import { banner, updateHud } from './ui/hud.js';
import { showMenu, isScreenOpen } from './ui/screens.js';
import { updateTech, toggleTech } from './ui/techPanel.js';
import { initInput } from './input.js';

const MAX_DT = 0.05;

function togglePause() {
  G.paused = !G.paused;
  banner(G.paused ? 'PAUSED' : '', '', G.paused ? Infinity : 0.01);
}

const muteBtn = $('mute');
const renderMute = () => {
  muteBtn.textContent = isMuted() ? '🔇' : '🔊';
  muteBtn.setAttribute('aria-pressed', isMuted());
};
function toggleMute() {
  setMuted(!isMuted());
  renderMute();
}
// Blur so Space (flares) doesn't re-trigger the button.
muteBtn.onclick = () => { toggleMute(); muteBtn.blur(); };
renderMute();

initInput({ flare: deployFlares, horn, pause: togglePause, toggleTech, toggleMute, start, canStart: isScreenOpen });
onResize(updatePointScale);
updatePointScale();

reset();
showMenu(start);

function update(dt) {
  G.time += dt;
  if (G.mode === 'play') {
    G.playTime += dt;
    updateDirector(dt);
  }
  updateShip(dt);
  updateThreats(dt);
  updateFlares(dt);
  updateMines(dt);
  updatePickups();
  updateNavy(dt);
  updateDebris(dt);
  updateShockwaves(dt);
  updateEffects(dt);
  updateCamera(dt);
  updateWorld(G.time, G.ship);
  updateHud(dt);
  setEngineLevel(G.mode === 'play' ? 0.05 + G.ship.speed * 0.006 : 0.02);
}

let last = performance.now();

// Uncapped loop: MessageChannel fires as fast as the CPU/GPU allow, unlike
// requestAnimationFrame, which is locked to the display refresh rate.
const channel = new MessageChannel();
const schedule = () => {
  if (document.hidden) setTimeout(schedule, 250); // idle while the tab is hidden
  else channel.port2.postMessage(0);
};
channel.port1.onmessage = () => frame(performance.now());

function frame(now) {
  schedule();
  const t0 = performance.now();
  const realDt = (now - last) / 1000;
  last = now;
  update(G.paused ? 0 : Math.min(MAX_DT, realDt));
  renderer.render(scene, camera);
  updateTech(realDt, performance.now() - t0);
}

schedule();
