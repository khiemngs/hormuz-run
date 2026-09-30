import * as THREE from 'three';
import { G } from '../game/state.js';
import { renderer, scene } from '../core/engine.js';
import { fx, smoke } from '../fx/effects.js';
import { intensity } from '../game/director.js';
import { $ } from '../utils/dom.js';

const REFRESH = 0.25;    // panel text, seconds
const SCENE_WALK = 0.5;  // vertex count, seconds
const HISTORY = 50;

const t = {
  shown: true, frames: 0, acc: 0, cpu: 0, worst: 0, sceneT: 0,
  history: [], verts: 0, meshes: 0, objects: 0,
};

const gpuName = (() => {
  const gl = renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  return name.replace(/^ANGLE \((.*)\)$/, '$1').split(',').slice(0, 2).join(',').slice(0, 34);
})();

export function toggleTech() {
  t.shown = !t.shown;
  $('tech').style.display = t.shown ? '' : 'none';
}

// Scene walk is costly, so it runs a few times per second rather than every frame.
function countScene() {
  let verts = 0, meshes = 0, objects = 0;
  scene.traverseVisible(o => {
    objects++;
    const pos = o.geometry?.attributes?.position;
    if (!pos) return;
    meshes++;
    verts += o.isInstancedMesh ? pos.count * o.count : pos.count;
  });
  Object.assign(t, { verts, meshes, objects });
}

function drawGraph() {
  const g = $('fpsGraph').getContext('2d'), W = 200, H = 34, bw = W / HISTORY;
  g.clearRect(0, 0, W, H);
  t.history.forEach((fps, i) => {
    g.fillStyle = fps >= 55 ? '#4be37a' : fps >= 30 ? '#ffb13b' : '#ff4b3a';
    const h = Math.min(1, fps / 120) * H;
    g.fillRect(i * bw, H - h, bw - 1, h);
  });
  g.fillStyle = 'rgba(255,255,255,.25)';
  g.fillRect(0, H / 2, W, 1); // 60 fps line
}

const fmt = n => n.toLocaleString();
const row = (k, v) => `<div class="t"><span>${k}</span><b>${v}</b></div>`;
const head = k => `<div class="lbl h">${k}</div>`;

// Call after renderer.render so renderer.info holds this frame's numbers.
export function updateTech(dt, cpuMs) {
  if (!t.shown) return;
  t.frames++;
  t.acc += dt;
  t.cpu += cpuMs;
  t.worst = Math.max(t.worst, dt * 1000);
  if ((t.sceneT -= dt) <= 0) { t.sceneT = SCENE_WALK; countScene(); }
  if (t.acc < REFRESH) return;

  const fps = t.frames / t.acc, ms = (t.acc / t.frames) * 1000, cpu = t.cpu / t.frames, worst = t.worst;
  t.history.push(fps);
  if (t.history.length > HISTORY) t.history.shift();
  Object.assign(t, { frames: 0, acc: 0, cpu: 0, worst: 0 });
  drawGraph();

  const r = renderer.info.render, mem = renderer.info.memory, s = G.ship;
  const buf = renderer.getDrawingBufferSize(new THREE.Vector2());
  const heap = performance.memory ? `${(performance.memory.usedJSHeapSize / 1048576).toFixed(0)} MB` : 'n/a';

  $('techBody').innerHTML =
    row('FPS', fps.toFixed(0)) +
    row('Frame / worst', `${ms.toFixed(1)} / ${worst.toFixed(1)} ms`) +
    row('CPU update+render', `${cpu.toFixed(2)} ms`) +
    head('Render') +
    row('Draw calls', fmt(r.calls)) +
    row('Triangles', fmt(r.triangles)) +
    row('Points (buffers)', fmt(r.points)) +
    row('Vertices (visible)', fmt(t.verts)) +
    row('Meshes / objects', `${fmt(t.meshes)} / ${fmt(t.objects)}`) +
    row('Geometries', fmt(mem.geometries)) +
    row('Textures', fmt(mem.textures)) +
    row('Shader programs', fmt(renderer.info.programs?.length ?? 0)) +
    head('Game') +
    row('Particles fx / smoke', `${fmt(fx.alive())} / ${fmt(smoke.alive())}`) +
    row('Shells / missiles', `${G.shells.length} / ${G.crosses.length + G.homings.length}`) +
    row('Boats / bullets', `${G.boats.length} / ${G.bullets.length}`) +
    row('Mines / pickups', `${G.mines.length} / ${G.pickups.length}`) +
    row('Floating cargo', G.debris.length) +
    row('Intensity', G.mode === 'play' ? intensity().toFixed(2) : '-') +
    row('Ship x / z', `${s.x.toFixed(0)} / ${s.z.toFixed(0)}`) +
    head('System') +
    row('Resolution', `${buf.x}×${buf.y} @${renderer.getPixelRatio()}x`) +
    row('JS heap', heap) +
    row('Three.js', `r${THREE.REVISION}`) +
    `<div style="opacity:.7;margin-top:2px">${gpuName}</div>`;
}
