import * as THREE from 'three';
import { scene } from '../core/engine.js';
import { FOG_COLOR, FOG_FAR, SUN_DIR, SKY_TOP, SKY_LOW } from '../config.js';
import { NOISE_TEX } from './noise.js';

// Gradient dome with a sun disc and drifting clouds. It is pinned to the far plane
// and drawn after everything opaque, so only pixels nothing else covered are shaded.
export function createSky() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uNoise: { value: NOISE_TEX },
      uTop: { value: SKY_TOP },
      uLow: { value: SKY_LOW },
      uFog: { value: FOG_COLOR },
      uSun: { value: SUN_DIR },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position.z = gl_Position.w; // depth 1.0: behind all geometry
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uLow, uFog, uSun;
      uniform float uTime;
      varying vec3 vDir;

      uniform sampler2D uNoise;

      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, 0.0, 1.0);
        vec3 col = mix(uLow, uTop, pow(h, 0.6));

        float s = max(dot(d, uSun), 0.0);
        col += vec3(1.0, 0.5, 0.2) * pow(s, 6.0) * 0.5;

        // Stretched cirrus, lit warm near the sun.
        if (d.y > 0.02) {
          vec2 uv = d.xz / (d.y + 0.12) * vec2(0.07, 0.17) + uTime * vec2(0.0006, 0.0002);
          float c = smoothstep(0.5, 0.72, texture2D(uNoise, uv).r * 0.7 + texture2D(uNoise, uv * 2.7 + 0.37).r * 0.3);
          vec3 cloud = mix(vec3(1.0, 0.72, 0.5), vec3(1.0, 0.94, 0.88), h) * (1.0 + pow(s, 4.0) * 0.8);
          col = mix(col, cloud, c * 0.6 * smoothstep(0.02, 0.22, d.y));
        }

        col += vec3(1.0, 0.9, 0.7) * smoothstep(0.9975, 0.999, s) * 4.0;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uFog, 1.0 - smoothstep(0.0, 0.22, d.y));
      }`,
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(FOG_FAR * 0.9, 32, 16), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  scene.add(mesh);
  return { mesh, material };
}
