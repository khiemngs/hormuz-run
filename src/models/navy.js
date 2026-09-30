import * as THREE from 'three';
import { mat, extrude, box, castShadows } from './materials.js';

export function buildDestroyer() {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(-2.4, -14);
  s.lineTo(2.4, -14);
  s.lineTo(2.7, 4);
  s.quadraticCurveTo(2.7, 11, 0, 16);
  s.quadraticCurveTo(-2.7, 11, -2.7, 4);
  s.closePath();
  g.add(new THREE.Mesh(extrude(s, 3.2, -1.2), [mat(0x555c63), mat(0x6f7a86)]));

  const grey = mat(0x7d8894), dark = mat(0x3c434b);
  box(4.2, 3.2, 9, grey, 0, 3.6, 1, g);
  box(3.4, 2.2, 4, grey, 0, 6.3, -1.5, g);
  box(3.45, 0.6, 4.05, dark, 0, 6.9, -1.5, g);
  box(1.8, 2.2, 2.5, grey, 0, 6, 4.5, g);
  box(1.6, 1, 2, grey, 0, 2.5, -8.5, g);
  box(3, 0.15, 0.15, dark, 0, 11, -0.5, g);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 6), dark);
  mast.position.set(0, 10, -0.5);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3), dark);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 2.7, -10.2);
  g.add(mast, barrel);
  return castShadows(g);
}

// Coastal missile battery. Launcher faces +x, toward the shipping lane.
export function buildBattery() {
  const g = new THREE.Group();
  box(6, 2.4, 5, mat(0xa38b68), 0, 1.2, 0, g);
  const launcher = box(6.5, 1.2, 1.4, mat(0x5b6440), 0.8, 3, 0, g);
  launcher.rotation.z = 0.45;
  box(0.2, 0.2, 5.2, mat(0x333333), 0.5, 2.5, 0, g);
  return castShadows(g);
}

export function buildFastBoat() {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(-1.1, -3);
  s.lineTo(1.1, -3);
  s.lineTo(1.1, 1);
  s.quadraticCurveTo(1.1, 2.5, 0, 3.5);
  s.quadraticCurveTo(-1.1, 2.5, -1.1, 1);
  s.closePath();
  g.add(new THREE.Mesh(extrude(s, 1.2, -0.4), [mat(0x2e3a2c), mat(0xe8e6dc)]));
  box(1.4, 0.9, 1.4, mat(0x2e3a2c), 0, 1.2, 0.6, g);
  box(0.2, 0.2, 1.4, mat(0x111111), 0, 1.2, -2.2, g);
  return castShadows(g);
}
