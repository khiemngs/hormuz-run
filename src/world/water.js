import * as THREE from 'three';
import { scene } from '../core/engine.js';
import { FOG_COLOR, FOG_NEAR, FOG_FAR, SUN_DIR, IS_TOUCH } from '../config.js';

// Waves are computed from world position, so the plane can follow the ship freely.
export function createWater() {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSun: { value: SUN_DIR },
      uFog: { value: FOG_COLOR },
      uNear: { value: FOG_NEAR },
      uFar: { value: FOG_FAR },
      uDeep: { value: new THREE.Color(0x0b3346) },
      uShallow: { value: new THREE.Color(0x2c7a86) },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vW;
      varying float vH;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        float h = sin(w.x * 0.08 + uTime * 1.2) * 0.6 + sin(w.z * 0.06 + uTime * 0.9) * 0.8
                + sin((w.x + w.z) * 0.15 + uTime * 2.0) * 0.25 + sin(w.x * 0.31 - w.z * 0.23 + uTime * 2.7) * 0.12;
        w.y += h;
        vH = h;
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun, uFog, uDeep, uShallow;
      uniform float uNear, uFar, uTime;
      varying vec3 vW;
      varying float vH;
      void main() {
        vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
        if (n.y < 0.0) n = -n;
        n = normalize(n + vec3(sin(vW.x * 0.9 + uTime * 3.0) * 0.025, 0.0, cos(vW.z * 0.8 - uTime * 2.5) * 0.025));
        vec3 v = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
        vec3 col = mix(uDeep, uShallow, clamp(vH * 0.3 + 0.45, 0.0, 1.0));
        col *= 0.6 + 0.5 * max(dot(n, uSun), 0.0);
        col = mix(col, vec3(0.62, 0.45, 0.34), fres * 0.35);
        col += vec3(1.0, 0.8, 0.55) * pow(max(dot(n, normalize(uSun + v)), 0.0), 400.0) * 1.2;
        col += smoothstep(1.2, 1.7, vH) * vec3(0.25);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uFog, smoothstep(uNear, uFar, length(cameraPosition - vW)));
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1300, ...(IS_TOUCH ? [100, 130] : [160, 210])).rotateX(-Math.PI / 2), material);
  mesh.frustumCulled = false;
  scene.add(mesh);
  return { mesh, material };
}
