import * as THREE from 'three';
import { MODEL_MAT, loftHull, pbox, pcyl, ptaper, merged } from './build.js';
import { canvasTexture } from '../utils/canvas.js';

const C = {
  antifoul: 0x9c2a22, boot: 0xe8e4da, hull: 0x1d2a44, deck: 0x46524a, hatch: 0x6a4636,
  white: 0xf2f0ea, glass: 0x121822, steel: 0x3a4048, funnel: 0xc8372b, black: 0x151515, orange: 0xe8741e,
};

// Container stowage, in ship-local coordinates.
export const BAYS_Z = [-13.4, -7.5, -1.6, 4.3, 10.2];
export const ROWS_X = [-2.55, 0, 2.55];
export const TIERS = 3;
export const TIER_Y = tier => 5.45 + tier * 2.45;
export const CONTAINER_COLORS = [0xc0392b, 0x2471a3, 0x229954, 0xe67e22, 0x7d3c98, 0x148f77, 0xd35400, 0x839192, 0xe8e6e0, 0xf1c40f];
export const CONTAINER_GEO = new THREE.BoxGeometry(2.4, 2.4, 5.6);

// White corrugated panel; the per-instance colour tints it.
const corrugated = canvasTexture(64, 64, g => {
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 64, 64);
  for (let x = 0; x < 64; x += 8) {
    g.fillStyle = 'rgba(0,0,0,0.2)';
    g.fillRect(x, 0, 3, 64);
    g.fillStyle = 'rgba(0,0,0,0.07)';
    g.fillRect(x + 3, 0, 1, 64);
  }
  g.strokeStyle = 'rgba(0,0,0,0.5)';
  g.lineWidth = 5;
  g.strokeRect(0, 0, 64, 64);
});
export const CONTAINER_MAT = new THREE.MeshLambertMaterial({ map: corrugated });

function shipGeometry() {
  const hull = loftHull({
    length: 44, beam: 9, bow: 0.3, stern: 0.12, sternW: 0.82, rake: 2.2, sheer: 0.9, deckColor: C.deck,
    levels: [
      { y: -2.6, w: 0.55, color: C.antifoul },
      { y: -0.9, w: 0.94, color: C.antifoul },
      { y: 0.45, w: 1, color: C.boot },
      { y: 0.8, w: 1, color: C.hull },
      { y: 4.2, w: 1 },
    ],
  }).translate(0, 0, -1);

  const parts = [hull];

  // Hatch covers under each bay and lashing bridges between them.
  for (const z of BAYS_Z) parts.push(pbox(8, 0.22, 5.4, C.hatch, 0, 4.3, z));
  for (const z of [-10.45, -4.55, 1.35, 7.25, 13.15]) {
    parts.push(pbox(0.25, 7.5, 0.2, C.steel, -4.1, 7.95, z), pbox(0.25, 7.5, 0.2, C.steel, 4.1, 7.95, z), pbox(8.45, 0.2, 0.2, C.steel, 0, 11.75, z));
  }

  // Forecastle
  parts.push(
    pbox(5.2, 1.1, 0.3, C.steel, 0, 4.9, -17.4),
    pbox(0.9, 0.7, 1, C.steel, -1.2, 4.8, -18.8), pbox(0.9, 0.7, 1, C.steel, 1.2, 4.8, -18.8),
    pcyl(0.1, 0.16, 5, 6, C.white, 0, 7.2, -19.8), pbox(1.6, 0.12, 0.12, C.white, 0, 9.2, -19.8),
  );

  // Accommodation block and bridge
  parts.push(
    pbox(8.6, 6, 4.6, C.white, 0, 7.2, 16),
    pbox(8, 2.2, 4.2, C.white, 0, 11.3, 16),
    pbox(9.4, 1.7, 3.6, C.white, 0, 13.25, 15.7),
    pbox(9.46, 0.75, 3.66, C.glass, 0, 13.45, 15.7),
    pbox(9.7, 0.2, 3.9, C.white, 0, 14.2, 15.7),
    pbox(13, 0.35, 1.6, C.white, 0, 12.55, 14.6),
    pbox(0.9, 1.1, 1.6, C.white, -6.05, 13.1, 14.6), pbox(0.9, 1.1, 1.6, C.white, 6.05, 13.1, 14.6),
  );
  for (const y of [6, 7.5, 9, 11.4]) parts.push(pbox(7.4, 0.4, 0.08, C.glass, 0, y, 13.68));

  // Radar mast
  parts.push(
    pcyl(0.14, 0.2, 3.6, 6, C.white, 0, 16.1, 16.4),
    pbox(3.2, 0.14, 0.14, C.white, 0, 16.7, 16.4),
    pbox(2.2, 0.2, 0.4, C.steel, 0, 18, 16.4),
  );

  // Engine casing and funnel
  parts.push(
    pbox(4.2, 6.5, 2.4, C.white, 0, 7.45, 19.6),
    ptaper(2.5, 4.6, 2.3, 0.85, 0.85, C.funnel, 0, 13, 19.6),
    pbox(2.4, 0.6, 2.2, C.white, 0, 13.7, 19.6),
    pbox(2.2, 0.7, 2, C.black, 0, 15.6, 19.6),
  );

  // Lifeboats on davits
  for (const side of [-1, 1]) {
    parts.push(ptaper(1.1, 1.1, 3.4, 0.7, 0.85, C.orange, side * 4.95, 8.3, 16.2), pbox(0.5, 0.15, 3, C.steel, side * 4.6, 9, 16.2));
  }

  return merged(parts);
}

// Player ship. Bow points -z; hull is ~44 units long and 9 wide.
export function createContainerShip() {
  const group = new THREE.Group();
  group.rotation.order = 'YXZ';

  const body = new THREE.Mesh(shipGeometry(), MODEL_MAT);
  body.castShadow = true;
  body.receiveShadow = true;

  const shield = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({
    color: 0x55bbff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  }));
  shield.scale.set(10, 8, 28);
  shield.position.y = 4;
  shield.visible = false;

  group.add(body, shield);
  return { group, shield };
}
