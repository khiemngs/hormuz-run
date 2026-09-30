import * as THREE from 'three';
import { G } from '../game/state.js';
import { camera } from '../core/engine.js';
import { TRACK, CARGO_MAX } from '../config.js';
import { progressAt } from '../world/geography.js';
import { $ } from '../utils/dom.js';
import { sfxRadio } from '../audio/sfx.js';

const RADIO_TIME = 3.8;
const POPUP_TIME = 1.5;
const STATS_INTERVAL = 0.1; // seconds between text refreshes

const hud = $('hud');
const radioQueue = [];
let pops = [];
let bannerT = 0, radioT = 0, statsT = 0, vignetteTimer = 0;

export function banner(title, sub = '', dur = 2.2, color = '#fff') {
  $('banner').innerHTML = `<span style="color:${color}">${title}</span>${sub ? `<small>${sub}</small>` : ''}`;
  $('banner').style.opacity = 1;
  bannerT = dur;
}

export function radio(who, text) {
  if (radioQueue.length < 4) radioQueue.push([who, text]);
}

// Floating score text anchored to a world position.
export function popup(text, pos, color = '#fff') {
  const el = document.createElement('div');
  el.className = 'pop';
  el.textContent = text;
  el.style.color = color;
  hud.appendChild(el);
  pops.push({ el, pos: pos.clone(), t: 0 });
}

export function flashVignette(color, strength) {
  $('vignette').style.boxShadow = `inset 0 0 ${160 + strength * 80}px ${30 + strength * 30}px ${color}`;
  clearTimeout(vignetteTimer);
  vignetteTimer = setTimeout(() => ($('vignette').style.boxShadow = 'none'), 180);
}

export function clearHud() {
  for (const p of pops) p.el.remove();
  pops = [];
  radioQueue.length = 0;
  statsT = 0;
}

function updateStats() {
  const s = G.ship;
  $('hullBar').style.width = `${s.hp}%`;
  $('cargo').textContent = `${G.cargo.length}/${CARGO_MAX}`;
  $('speed').textContent = `${(s.speed * 1.1).toFixed(0)} kn`;
  $('score').textContent = Math.floor(G.score + s.dist).toLocaleString();
  $('dist').textContent = `${Math.max(0, (TRACK + s.z) / 100).toFixed(1)} nm`;
  $('flares').textContent = s.flares;
  $('tFlareN').textContent = s.flares;
  $('tHorn').classList.toggle('cd', s.hornCd > 0);
  $('horn').textContent = s.hornCd > 0 ? `${s.hornCd.toFixed(1)}s` : 'READY';
  $('shipdot').style.left = `${progressAt(s.z) * 100}%`;

  const tags = [];
  if (s.shield > 0) tags.push(`<span style="color:#6fc3ff">🛡️ SHIELD ${s.shield.toFixed(1)}</span>`);
  if (s.turbo > 0) tags.push(`<span style="color:#ff7ae0">⚡ TURBO ${s.turbo.toFixed(1)}</span>`);
  if (G.dir.evt === 'ceasefire') tags.push('<span style="color:#9fe0ff">CEASEFIRE</span>');
  if (G.dir.evt === 'escalation') tags.push('<span style="color:#ff4b3a">ESCALATION</span>');
  $('status').innerHTML = tags.join(' · ');

  $('lock').classList.toggle('on', G.lockedOn);
}

function updateMessages(dt) {
  if (bannerT > 0 && (bannerT -= dt) <= 0) $('banner').style.opacity = 0;

  if ((radioT -= dt) > 0) return;
  if (radioQueue.length) {
    const [who, text] = radioQueue.shift();
    $('radio').innerHTML = `📻 <b>${who}:</b> ${text}`;
    $('radio').style.opacity = 1;
    radioT = RADIO_TIME;
    sfxRadio();
  } else {
    $('radio').style.opacity = 0;
  }
}

const v = new THREE.Vector3();

function updatePopups(dt) {
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i];
    p.t += dt;
    v.copy(p.pos);
    v.y += p.t * 8;
    v.project(camera);
    p.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * innerWidth}px, ${(-v.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -50%)`;
    p.el.style.opacity = 1 - p.t / POPUP_TIME;
    if (p.t > POPUP_TIME || v.z > 1) {
      p.el.remove();
      pops.splice(i, 1);
    }
  }
}

export function updateHud(dt) {
  if ((statsT -= dt) <= 0) {
    statsT = STATS_INTERVAL;
    updateStats();
  }
  updateMessages(dt);
  updatePopups(dt);
}
