import * as THREE from 'three';
import { FOG_COLOR, FOG_NEAR, FOG_FAR } from '../config.js';

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.prepend(renderer.domElement);

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);

export const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.5, 1500);

scene.add(new THREE.HemisphereLight(0xffe2c4, 0x3a4a5a, 1.2));

export const sun = new THREE.DirectionalLight(0xffd2a0, 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.radius = 3;
sun.shadow.bias = -0.0005;
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 10, far: 500 });
scene.add(sun, sun.target);

// One shared light flashes at each explosion.
export const boomLight = new THREE.PointLight(0xffa050, 0, 180, 1);
scene.add(boomLight);

// Everything spawned during a run lives here, so a restart wipes it in one call.
export const dyn = new THREE.Group();
scene.add(dyn);

const resizeHandlers = [];
export const onResize = fn => resizeHandlers.push(fn);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  resizeHandlers.forEach(fn => fn());
});
