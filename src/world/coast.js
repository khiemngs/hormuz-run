import * as THREE from 'three';
import { scene } from '../core/engine.js';
import { TRACK, IRAN_OFF, IRAN_SEED } from '../config.js';
import { laneHalf, landH, coastX } from './geography.js';
import { textSprite } from '../utils/canvas.js';

// Builds a coastline on the +x side. Mirroring via scale.x = -1 places it to port.
function buildLand(offset, seed, mirror) {
  const L = TRACK + 1400, W = 260;
  const geo = new THREE.PlaneGeometry(1, 1, 36, 280).rotateX(-Math.PI / 2);
  const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();

  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) + 0.5, v = p.getZ(i) + 0.5;
    const z = -(TRACK + 900) + v * L;
    const out = u * u * W;
    const h = landH(out, z, seed);
    p.setXYZ(i, coastX(z, offset, out), h, z);
    c.setHex(h < 0.6 ? 0xdcc294 : h < 7 ? 0xc49a6c : h < 18 ? 0x9a7552 : 0xb49a80);
    c.offsetHSL(0, 0, (Math.random() - 0.5) * 0.04);
    col.set([c.r, c.g, c.b], i * 3);
  }

  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  mesh.receiveShadow = true;
  if (mirror) mesh.scale.x = -1;
  scene.add(mesh);
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
  buildLand(IRAN_OFF, IRAN_SEED, true); // Iranian coast, port side
  buildLand(78, 50, false);             // Omani coast, far starboard
  buildBuoys();
  buildFinishGate();
}
