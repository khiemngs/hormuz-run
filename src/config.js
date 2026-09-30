import * as THREE from 'three';

// Length of the run in world units. 100 units = 1 nautical mile on the HUD.
export const TRACK = 4000;

export const CARGO_MAX = 45;

// Iranian coast offset from the lane edge and its terrain noise seed.
export const IRAN_OFF = 10;
export const IRAN_SEED = 0;

export const SUN_DIR = new THREE.Vector3(-0.45, 0.3, -0.84).normalize();

export const FOG_NEAR = 140;
export const FOG_FAR = 720;

// Fog is mixed in after tone mapping, so it is defined in display space.
export const FOG_COLOR = new THREE.Color().setRGB(0.86, 0.66, 0.5, THREE.LinearSRGBColorSpace);

// Phones and tablets get touch controls, a vsynced loop and lighter rendering.
export const IS_TOUCH = matchMedia('(pointer: coarse)').matches;
