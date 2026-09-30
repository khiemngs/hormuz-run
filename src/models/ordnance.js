import * as THREE from 'three';
import { mat } from './materials.js';
import { canvasTexture } from '../utils/canvas.js';

export const SHELL_GEO = new THREE.SphereGeometry(0.55, 8, 6);
export const SHELL_MAT = new THREE.MeshBasicMaterial({ color: 0xffb040 });
export const BULLET_GEO = new THREE.BoxGeometry(0.15, 0.15, 1.8);
export const BULLET_MAT = new THREE.MeshBasicMaterial({ color: 0xffee66 });

// Missile body runs along +z, so Object3D.lookAt points the nose at the target.
export function buildMissile() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 3.2, 8).rotateX(Math.PI / 2), mat(0xdddddd));
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.9, 8).rotateX(Math.PI / 2), mat(0xaa2222));
  nose.position.z = 2.05;
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffaa44 }));
  glow.position.z = -1.8;
  g.add(body, nose, glow);
  return g;
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
