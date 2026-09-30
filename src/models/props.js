import * as THREE from 'three';
import { mat, paint, merged } from './build.js';
import { emojiTexture } from '../utils/canvas.js';

// Contact mine: faceted body with horns. Drawn instanced.
export function mineGeometry() {
  const HORN = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion();
  const dirs = [[0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0.7, 0.7, 0.7], [-0.7, 0.7, 0.7], [0.7, 0.7, -0.7], [-0.7, 0.7, -0.7]];
  const horns = dirs.map(d => {
    const dir = new THREE.Vector3(...d).normalize();
    return paint(new THREE.ConeGeometry(0.17, 0.75, 5).applyQuaternion(q.setFromUnitVectors(HORN, dir)), 0x4a4f4c)
      .translate(dir.x * 1.5, dir.y * 1.5, dir.z * 1.5);
  });
  return merged([paint(new THREE.IcosahedronGeometry(1.3, 1), 0x2a2d2c), ...horns]);
}

// Blinking light on the top horn; a separate instanced mesh so one colour change blinks them all.
export const MINE_LIGHT_GEO = new THREE.SphereGeometry(0.32, 6, 4).translate(0, 2, 0);
export const MINE_LIGHT_MAT = new THREE.MeshBasicMaterial({ color: 0xff2200 });
export const setMineBlink = on => MINE_LIGHT_MAT.color.setHex(on ? 0xff2200 : 0x330000);

export const PICKUPS = {
  repair: { color: 0x2ecc71, emoji: '🔧', label: 'HULL REPAIR +30', css: '#4be37a' },
  flare:  { color: 0xff8c1a, emoji: '🎆', label: '+2 FLARES', css: '#ffb13b' },
  shield: { color: 0x3fa9ff, emoji: '🛡️', label: 'NEUTRAL FLAG SHIELD', css: '#6fc3ff' },
  turbo:  { color: 0xff3fd0, emoji: '⚡', label: 'TURBO!', css: '#ff7ae0' },
  gold:   { color: 0xffd21a, emoji: '💰', label: 'BONUS CARGO +300', css: '#ffe05a' },
};

export const PICKUP_WEIGHTS = [['gold', 30], ['repair', 22], ['flare', 20], ['turbo', 14], ['shield', 14]];

const CRATE_GEO = new THREE.BoxGeometry(2.4, 2.4, 2.4);
const RING_GEO = new THREE.TorusGeometry(2.6, 0.16, 8, 32);
for (const p of Object.values(PICKUPS)) {
  p.crateMat = mat(p.color, { emissive: p.color, emissiveIntensity: 0.5 });
  p.ringMat = new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
  p.spriteMat = new THREE.SpriteMaterial({ map: emojiTexture(p.emoji), depthWrite: false });
}

export function buildPickup(type) {
  const p = PICKUPS[type], g = new THREE.Group();
  g.add(new THREE.Mesh(CRATE_GEO, p.crateMat));
  const ring = new THREE.Mesh(RING_GEO, p.ringMat);
  ring.rotation.x = Math.PI / 2;
  const icon = new THREE.Sprite(p.spriteMat);
  icon.scale.set(3.5, 3.5, 1);
  icon.position.y = 4;
  g.add(ring, icon);
  return g;
}
