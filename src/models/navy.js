import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MODEL_MAT, loftHull, paint, pbox, pcyl, ptaper, merged } from './build.js';

const GREY = 0x7d8894, DARK = 0x3c434b, GLASS = 0x121822;

// US destroyer. Bow points -z, 32 units long. Sloped, stealth-style superstructure.
export function destroyerGeometry() {
  const hull = loftHull({
    length: 32, beam: 5.4, bow: 0.45, stern: 0.1, sternW: 0.85, rake: 3.5, sheer: 0.9, flare: 0.75, deckColor: 0x4c535b,
    levels: [
      { y: -1.4, w: 0.4, color: 0x5a2a28 },
      { y: -0.2, w: 0.85, color: 0x5a2a28 },
      { y: 0.35, w: 0.95, color: GREY },
      { y: 2.2, w: 1 },
    ],
  });
  const barrel = paint(new THREE.CylinderGeometry(0.09, 0.11, 3, 6).rotateX(Math.PI / 2), DARK).translate(0, 2.85, -11.3);

  return merged([
    hull,
    ptaper(4.6, 2.6, 9, 0.8, 0.92, GREY, 0, 3.5, 0),          // main deckhouse
    ptaper(3.8, 1.8, 3.6, 0.85, 0.85, GREY, 0, 5.7, -2.4),    // bridge
    pbox(3.5, 0.45, 0.1, GLASS, 0, 5.85, -4.1),
    ptaper(1.2, 4, 1.2, 0.4, 0.4, DARK, 0, 8.6, -1.5),        // mast
    pbox(3.2, 0.12, 0.12, DARK, 0, 9.6, -1.5),
    paint(new THREE.IcosahedronGeometry(0.7, 1), 0xe8e8e8).translate(0, 7.3, 1.2), // radome
    ptaper(1.8, 2.2, 2.4, 0.75, 0.75, GREY, 0, 5.9, 3),       // funnel
    pbox(1.3, 0.3, 1.7, DARK, 0, 7.1, 3),
    pbox(4.2, 2.2, 4, GREY, 0, 3.3, 7.5),                     // hangar
    pbox(3.2, 0.05, 3.6, 0x6a727a, 0, 2.23, 12.4),            // helipad
    pbox(0.18, 0.06, 2.4, 0xe8e8e8, -0.7, 2.25, 12.4), pbox(0.18, 0.06, 2.4, 0xe8e8e8, 0.7, 2.25, 12.4), pbox(1.4, 0.06, 0.18, 0xe8e8e8, 0, 2.25, 12.4),
    pbox(2.2, 0.15, 2.4, DARK, 0, 2.3, -6.6),                 // missile cells
    ptaper(1.5, 0.9, 1.9, 0.7, 0.8, GREY, 0, 2.65, -9.5),     // gun turret
    barrel,
  ]);
}

// Truck-mounted coastal missile battery behind a sand berm. Launcher faces +x.
export function batteryGeometry() {
  const OLIVE = 0x4b5237, TUBE = 0x5f6b45, BLACK = 0x151515;
  const launcher = mergeGeometries([pbox(4.4, 1.1, 1.7, TUBE), pbox(0.12, 0.85, 1.45, BLACK, 2.22, 0, 0)])
    .rotateZ(0.45).translate(0.9, 3.3, 0);
  const wheels = [-1.8, 0.2, 1.7].map(x => paint(new THREE.CylinderGeometry(0.45, 0.45, 2.2, 8).rotateX(Math.PI / 2), BLACK).translate(x, 1.1, 0));

  return merged([
    ptaper(7.5, 1.1, 6.5, 0.85, 0.85, 0xb39a72, 0, 0.55, 0),
    pbox(5.2, 0.7, 2, OLIVE, 0, 1.45, 0),
    pbox(1.4, 1.2, 1.9, 0x556040, -1.9, 2.4, 0),
    pbox(0.08, 0.5, 1.6, GLASS, -1.17, 2.6, 0),
    ...wheels,
    launcher,
    pcyl(0.08, 0.08, 2.4, 5, DARK, -2.8, 2.3, 2.2),
    pbox(0.1, 0.9, 1.2, DARK, -2.8, 3.6, 2.2),
  ]);
}

let boatGeo = null;

// IRGC fast attack boat. Bow points -z, 7 units long.
export function buildFastBoat() {
  boatGeo ??= merged([
    loftHull({
      length: 7, beam: 2.3, bow: 0.55, stern: 0.1, sternW: 0.9, rake: 1, sheer: 0.35, segments: 10, deckColor: 0x8a8f86,
      levels: [{ y: -0.4, w: 0.45, color: 0x2e3a2c }, { y: 0.2, w: 0.9, color: 0xe8e6dc }, { y: 0.85, w: 1 }],
    }),
    pbox(1.1, 0.7, 1, 0x2e3a2c, 0, 1.2, 0.6),
    pbox(1.1, 0.4, 0.08, GLASS, 0, 1.75, 0.12),
    pbox(0.4, 0.8, 0.35, 0x3b3f2c, 0, 1.7, 1.1),
    pbox(0.14, 0.14, 1.3, 0x151515, 0, 1.35, -1.7),
    pbox(0.4, 0.9, 0.5, 0x151515, -0.45, 0.7, 3.6), pbox(0.4, 0.9, 0.5, 0x151515, 0.45, 0.7, 3.6),
    pbox(0.04, 0.35, 0.5, 0x2a8a3a, 0, 2.1, 3.1),
  ]);
  const mesh = new THREE.Mesh(boatGeo, MODEL_MAT);
  mesh.castShadow = true;
  return mesh;
}
