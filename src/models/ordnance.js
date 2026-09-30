import * as THREE from 'three';
import { MODEL_MAT, paint, pbox, merged } from './build.js';
import { canvasTexture } from '../utils/canvas.js';

export const SHELL_GEO = new THREE.SphereGeometry(0.55, 8, 6);
export const SHELL_MAT = new THREE.MeshBasicMaterial({ color: 0xffb040 });
export const BULLET_GEO = new THREE.BoxGeometry(0.15, 0.15, 1.8);
export const BULLET_MAT = new THREE.MeshBasicMaterial({ color: 0xffee66 });

let missileGeo = null;

// Missile body runs along +z, so Object3D.lookAt points the nose at the target.
export function buildMissile() {
  missileGeo ??= merged([
    paint(new THREE.CylinderGeometry(0.3, 0.3, 3.2, 8).rotateX(Math.PI / 2), 0xdddddd),
    paint(new THREE.ConeGeometry(0.3, 0.9, 8).rotateX(Math.PI / 2), 0xaa2222).translate(0, 0, 2.05),
    pbox(1.4, 0.06, 0.7, 0x8a8f96, 0, 0, -1.25),
    pbox(0.06, 1.4, 0.7, 0x8a8f96, 0, 0, -1.25),
    pbox(0.9, 0.05, 0.5, 0x8a8f96, 0, 0, 0.5),
    pbox(0.05, 0.9, 0.5, 0x8a8f96, 0, 0, 0.5),
  ]);
  return new THREE.Mesh(missileGeo, MODEL_MAT);
}

const RING_GEO = new THREE.RingGeometry(5.2, 6, 40).rotateX(-Math.PI / 2);
const DISC_GEO = new THREE.CircleGeometry(6, 40).rotateX(-Math.PI / 2);
const RING_MAT = new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.85, depthWrite: false });
const DISC_MAT = new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.3, depthWrite: false });

// Red target ring on the water. `fill` scales from 0 to 1 as the shell arrives.
export function createImpactMarker() {
  const group = new THREE.Group();
  const fill = new THREE.Mesh(DISC_GEO, DISC_MAT);
  group.add(new THREE.Mesh(RING_GEO, RING_MAT), fill);
  return { group, fill };
}

const chevronTex = canvasTexture(64, 32, g => {
  g.fillStyle = 'rgba(255,40,20,0.55)';
  g.fillRect(0, 0, 64, 32);
  g.strokeStyle = '#ffe0c0';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(18, 4);
  g.lineTo(40, 16);
  g.lineTo(18, 28);
  g.stroke();
});
chevronTex.wrapS = THREE.RepeatWrapping;
chevronTex.repeat.set(18, 1);
const LANE_GEO = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

// Chevron strip on the water from `from` to `to`, warning of a crossing missile.
export function createWarnLane(from, to) {
  const lane = new THREE.Mesh(LANE_GEO, new THREE.MeshBasicMaterial({ map: chevronTex, transparent: true, opacity: 0.8, depthWrite: false }));
  lane.scale.set(from.distanceTo(to), 1, 3.2);
  lane.position.set((from.x + to.x) / 2, 2.1, (from.z + to.z) / 2);
  lane.rotation.y = Math.atan2(-(to.z - from.z), to.x - from.x);
  return lane;
}

export function createShockwave() {
  return new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
    color: 0xfff0c0, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
}
