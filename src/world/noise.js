import * as THREE from 'three';

const SIZE = 256;

/**
 * Tileable fractal noise baked once at startup: R = height, GB = its slope.
 * Shaders sample it instead of evaluating noise or wave trains per pixel, and its
 * mipmaps keep distant water from shimmering.
 */
function bake() {
  const hash = (x, y, p) => {
    const s = Math.sin((((x % p) + p) % p) * 127.1 + (((y % p) + p) % p) * 311.7 + p * 74.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const vnoise = (x, y, p) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, p), b = hash(xi + 1, yi, p), c = hash(xi, yi + 1, p), d = hash(xi + 1, yi + 1, p);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };

  const h = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    let sum = 0, amp = 0.5, period = 4;
    for (let o = 0; o < 4; o++) {
      sum += amp * vnoise((x / SIZE) * period, (y / SIZE) * period, period);
      period *= 2;
      amp *= 0.5;
    }
    h[y * SIZE + x] = sum / 0.9375;
  }

  const at = (x, y) => h[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)];
  const pack = v => Math.max(0, Math.min(255, Math.round(v * 255)));
  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4;
    data[i] = pack(at(x, y));
    data[i + 1] = pack(0.5 + (at(x + 1, y) - at(x - 1, y)) * SIZE / 48);
    data[i + 2] = pack(0.5 + (at(x, y + 1) - at(x, y - 1)) * SIZE / 48);
    data[i + 3] = 255;
  }

  const tex = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export const NOISE_TEX = bake();
