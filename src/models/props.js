import * as THREE from 'three';
import { mat } from './materials.js';
import { emojiTexture } from '../utils/canvas.js';

const MINE_GEO = new THREE.SphereGeometry(1.3, 14, 10);
const SPIKE_GEO = new THREE.CylinderGeometry(0.1, 0.1, 3.8, 6);
const MINE_MAT = mat(0x2b2b2b, { metalness: 0.6, roughness: 0.4 });
const MINE_LIGHT = new THREE.MeshBasicMaterial({ color: 0xff2200 });

// All mine lights share one material, so one call blinks every mine.
export const setMineBlink = on => MINE_LIGHT.color.setHex(on ? 0xff2200 : 0x330000);

export function buildMine() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(MINE_GEO, MINE_MAT));
  for (const r of [[0, 0, 0], [Math.PI / 2, 0, 0], [0, 0, Math.PI / 2]]) {
    const spike = new THREE.Mesh(SPIKE_GEO, MINE_MAT);
    spike.rotation.set(...r);
    g.add(spike);
  }
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), MINE_LIGHT);
  light.position.y = 1.5;
  g.add(light);
  return g;
}

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
