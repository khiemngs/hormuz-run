import * as THREE from 'three';
import { mat, extrude, box, castShadows } from './materials.js';
import { pick } from '../utils/math.js';

const CONTAINER_GEO = new THREE.BoxGeometry(2.4, 2.4, 5.6);
const CONTAINER_MATS = [0xc0392b, 0x2471a3, 0x229954, 0xe67e22, 0x7d3c98, 0x148f77, 0xd35400, 0x839192, 0xe8e6e0, 0xf1c40f].map(c => mat(c));
const BAYS_Z = [-13.4, -7.5, -1.6, 4.3, 10.2];
const ROWS_X = [-2.55, 0, 2.55];
const TIERS = 3;

// Player ship. Bow points -z; hull is ~44 units long and 9 wide.
export function createContainerShip() {
  const group = new THREE.Group();
  group.rotation.order = 'YXZ';
  const cargoGroup = new THREE.Group();
  group.add(cargoGroup);

  const s = new THREE.Shape();
  s.moveTo(-4.5, -21);
  s.lineTo(4.5, -21);
  s.lineTo(4.5, 9);
  s.quadraticCurveTo(4.5, 17, 0, 23);
  s.quadraticCurveTo(-4.5, 17, -4.5, 9);
  s.closePath();
  group.add(new THREE.Mesh(extrude(s, 3, -2.6), mat(0x9c2a22)));
  group.add(new THREE.Mesh(extrude(s, 3.8, 0.4), [mat(0x3d4a3f), mat(0x1c2230)]));

  const white = mat(0xf2f0ea), glass = mat(0x151a22, { roughness: 0.2, metalness: 0.5 });
  box(8.4, 9, 4.5, white, 0, 8.7, 15.5, group);   // accommodation block
  box(8.5, 1, 4.6, glass, 0, 12.2, 15.5, group);  // bridge windows
  box(12, 0.5, 2, white, 0, 12.9, 13.9, group);   // bridge wings
  box(2.4, 5, 3, mat(0xc0392b), 0, 12.5, 19.3, group);
  box(2.45, 0.8, 3.05, mat(0x111111), 0, 15.2, 19.3, group);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4), white);
  mast.position.set(0, 15.2, 15.5);
  group.add(mast);
  castShadows(group);

  const shield = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({
    color: 0x55bbff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  }));
  shield.scale.set(10, 8, 28);
  shield.position.y = 4;
  shield.visible = false;
  group.add(shield);

  return { group, cargoGroup, shield };
}

// Stacks fresh containers. The returned order makes pop() take from the top tier first.
export function fillCargo(cargoGroup) {
  cargoGroup.clear();
  const cargo = [];
  for (let tier = 0; tier < TIERS; tier++) {
    const layer = [];
    for (const z of BAYS_Z) for (const x of ROWS_X) {
      const m = new THREE.Mesh(CONTAINER_GEO, pick(CONTAINER_MATS));
      m.position.set(x, 5.45 + tier * 2.45, z);
      m.castShadow = true;
      m.receiveShadow = true;
      cargoGroup.add(m);
      layer.push(m);
    }
    layer.sort(() => Math.random() - 0.5);
    cargo.push(...layer);
  }
  return cargo;
}
