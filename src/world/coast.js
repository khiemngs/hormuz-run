import * as THREE from 'three';
import { scene } from '../core/engine.js';
import { TRACK, IRAN_OFF, IRAN_SEED, OMAN_OFF, OMAN_SEED } from '../config.js';
import { laneHalf, landH, coastX, vnoise } from './geography.js';
import { textSprite } from '../utils/canvas.js';

const LAND_MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const LAND_WIDTH = 260;
const CHUNKS = 12;
const Z_START = 500, Z_END = -(TRACK + 900);

// Sand on the beach, banded rock strata on the slopes, pale stone on the peaks.
function landColor(c, h, out, z) {
  const n = vnoise(out * 0.15, z * 0.15);
  if (h < 1.1) c.setHex(0xe3cc9c);
  else if (h < 5) c.setHex(0xcba877);
  else if (h > 32) c.setHex(0xc2ab8e);
  else {
    const band = Math.sin(h * 0.9 + n * 3);
    c.setHex(band > 0.3 ? 0xa9825a : band > -0.4 ? 0x94704c : 0x7f5f42);
  }
  c.offsetHSL(0, 0, (n - 0.5) * 0.07);
}

// Builds a coastline on the +x side, split into chunks along z so the renderer
// can cull the ones outside the view. Mirroring (scale.x = -1) puts it to port.
function buildLand(offset, seed, mirror) {
  const c = new THREE.Color(), len = (Z_END - Z_START) / CHUNKS;
  for (let k = 0; k < CHUNKS; k++) {
    const z0 = Z_START + k * len;
    const geo = new THREE.PlaneGeometry(1, 1, 36, 24).rotateX(-Math.PI / 2);
    const p = geo.attributes.position, col = new Float32Array(p.count * 3);

    for (let i = 0; i < p.count; i++) {
      // Plane z runs -0.5..0.5; chunk z runs z0 + len (far) to z0 (near), keeping faces up.
      const u = p.getX(i) + 0.5, z = z0 + len * (0.5 - p.getZ(i));
      const out = u * u * LAND_WIDTH, h = landH(out, z, seed);
      p.setXYZ(i, coastX(z, offset, out), h, z);
      landColor(c, h, out, z);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, LAND_MAT);
    mesh.receiveShadow = true;
    if (mirror) mesh.scale.x = -1;
    scene.add(mesh);
  }
}

function buildBuoys() {
  const zs = [];
  for (let z = 0; z > -TRACK; z -= 40) zs.push(z);
  const buoys = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.5, 0.9, 2.6, 8),
    new THREE.MeshStandardMaterial({ color: 0xd8342a, emissive: 0x551008 }),
    zs.length * 2,
  );
  const m = new THREE.Matrix4();
  zs.forEach((z, i) => {
    const hw = laneHalf(z);
    buoys.setMatrixAt(i * 2, m.makeTranslation(hw + 1, 0.6, z));
    buoys.setMatrixAt(i * 2 + 1, m.makeTranslation(-(hw + 1), 0.6, z));
  });
  buoys.frustumCulled = false;
  scene.add(buoys);
}

function buildFinishGate() {
  const hw = laneHalf(-TRACK);
  for (const side of [-1, 1]) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2, 22, 12), new THREE.MeshStandardMaterial({ color: 0xf4f4f4 }));
    tower.position.set(side * (hw - 2), 11, -TRACK);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 8), new THREE.MeshBasicMaterial({ color: 0x55ff88 }));
    lamp.position.set(side * (hw - 2), 23, -TRACK);
    scene.add(tower, lamp);
  }
  const sign = textSprite('GULF OF OMAN · SAFE WATERS', 1024, 128, '700 64px Rajdhani, sans-serif', '#ffffff', 'rgba(20,90,50,0.85)');
  sign.scale.set(64, 8, 1);
  sign.position.set(0, 26, -TRACK);
  scene.add(sign);
}

export function buildCoasts() {
  buildLand(IRAN_OFF, IRAN_SEED, true);  // Iranian coast, port side
  buildLand(OMAN_OFF, OMAN_SEED, false); // Omani coast, far starboard
  buildBuoys();
  buildFinishGate();
}
