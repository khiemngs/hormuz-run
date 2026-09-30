import * as THREE from 'three';
import { scene } from '../core/engine.js';
import { FOG_COLOR, SUN_DIR } from '../config.js';

export function createSky() {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(0x35588c) },
      uLow: { value: new THREE.Color(0xe0a070) },
      uFog: { value: FOG_COLOR },
      uSun: { value: SUN_DIR },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uLow, uFog, uSun;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, 0.0, 1.0);
        vec3 col = mix(uLow, uTop, pow(h, 0.6));
        float s = max(dot(d, uSun), 0.0);
        col += vec3(1.0, 0.5, 0.2) * pow(s, 6.0) * 0.5 + vec3(1.0, 0.9, 0.7) * smoothstep(0.9975, 0.999, s) * 4.0;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uFog, 1.0 - smoothstep(0.0, 0.22, d.y));
      }`,
  }));
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  scene.add(sky);
  return sky;
}
