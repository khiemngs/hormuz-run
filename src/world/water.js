import * as THREE from 'three';
import { scene } from '../core/engine.js';
import { FOG_COLOR, FOG_NEAR, FOG_FAR, SUN_DIR, SKY_TOP, SKY_LOW, TRACK, IRAN_OFF, OMAN_OFF, IS_TOUCH } from '../config.js';

const HALF_X = 600, HALF_Z = 800;
const DENSITY = 1.8; // >1 packs vertices toward the centre, where the camera is

// Grid that is fine near the ship and coarse toward the fogged horizon.
function lodGrid(segX, segZ) {
  const geo = new THREE.PlaneGeometry(2, 2, segX, segZ).rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const warp = v => Math.sign(v) * Math.pow(Math.abs(v), DENSITY);
  for (let i = 0; i < p.count; i++) p.setXYZ(i, warp(p.getX(i)) * HALF_X, 0, warp(p.getZ(i)) * HALF_Z);
  return geo;
}

/**
 * Ocean surface. The vertex shader displaces a coarse mesh; the fragment shader
 * derives normals analytically from the same waves, so shading stays smooth at any
 * mesh density. It also draws shoreline foam and the ship's wake.
 * Wave terms must match waveH() in geography.js.
 */
export function createWater() {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSun: { value: SUN_DIR },
      uFog: { value: FOG_COLOR },
      uNear: { value: FOG_NEAR },
      uFar: { value: FOG_FAR },
      uDeep: { value: new THREE.Color(0x0a2f42) },
      uShallow: { value: new THREE.Color(0x2c7a86) },
      uSkyTop: { value: SKY_TOP },
      uSkyLow: { value: SKY_LOW },
      uTrack: { value: TRACK },
      uShore: { value: new THREE.Vector2(IRAN_OFF - 4, OMAN_OFF - 4) }, // land start beyond the lane edge: port, starboard
      uShip: { value: new THREE.Vector4() },                           // x, z, cos(yaw), sin(yaw)
      uSpeed: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        w.y += sin(w.x * 0.08 + uTime * 1.2) * 0.6 + sin(w.z * 0.06 + uTime * 0.9) * 0.8
             + sin((w.x + w.z) * 0.15 + uTime * 2.0) * 0.25 + sin(w.x * 0.31 - w.z * 0.23 + uTime * 2.7) * 0.12;
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun, uFog, uDeep, uShallow, uSkyTop, uSkyLow;
      uniform float uNear, uFar, uTime, uTrack, uSpeed;
      uniform vec2 uShore;
      uniform vec4 uShip;
      varying vec3 vW;

      float laneHalf(float z) {
        float t = -z / uTrack - 0.55;
        return 50.0 - 22.0 * exp(-t * t / 0.02);
      }

      // Height and slope of the swell at p.
      float swell(vec2 p, out vec2 slope) {
        float a = p.x * 0.08 + uTime * 1.2, b = p.y * 0.06 + uTime * 0.9;
        float c = (p.x + p.y) * 0.15 + uTime * 2.0, d = p.x * 0.31 - p.y * 0.23 + uTime * 2.7;
        float dc = cos(c) * 0.0375, dd = cos(d) * 0.12;
        slope = vec2(cos(a) * 0.048 + dc + dd * 0.31, cos(b) * 0.048 + dc - dd * 0.23);
        return sin(a) * 0.6 + sin(b) * 0.8 + sin(c) * 0.25 + sin(d) * 0.12;
      }

      // Small wind ripples: three domain-warped wave trains.
      vec2 ripple(vec2 p) {
        p += 2.2 * sin(p.yx * 0.13 + uTime * 0.5) + 0.7 * sin(p * 0.47 - uTime * 0.8);
        vec2 s = vec2(0.8, 0.6) * cos(dot(p, vec2(0.8, 0.6)) * 0.9 + uTime * 2.1);
        s += vec2(-0.5, 0.86) * cos(dot(p, vec2(-0.5, 0.86)) * 1.6 - uTime * 2.7) * 0.8;
        s += vec2(0.3, -0.95) * cos(dot(p, vec2(0.3, -0.95)) * 2.7 + uTime * 3.4) * 0.6;
        s += vec2(-0.9, -0.4) * cos(dot(p, vec2(-0.9, -0.4)) * 4.1 - uTime * 4.3) * 0.4;
        return s;
      }

      vec3 sky(vec3 d) {
        vec3 c = mix(uSkyLow, uSkyTop, pow(clamp(d.y, 0.0, 1.0), 0.6));
        return c + vec3(1.0, 0.5, 0.2) * pow(max(dot(d, uSun), 0.0), 6.0) * 0.5;
      }

      void main() {
        vec2 p = vW.xz;
        vec3 toCam = cameraPosition - vW;
        float dist = length(toCam);
        vec3 v = toCam / dist;

        vec2 slope;
        float h = swell(p, slope);
        vec2 rip = ripple(p);
        slope += rip * 0.055 * (1.0 - smoothstep(50.0, 260.0, dist)); // fade ripples before they alias
        vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));

        // Distance to the nearer shore; water turns turquoise in the shallows.
        float hw = laneHalf(p.y);
        float shore = min(p.x + hw + uShore.x, hw + uShore.y - p.x);
        float shallow = 1.0 - smoothstep(0.0, 30.0, shore);

        vec3 col = mix(uDeep, uShallow, clamp(h * 0.3 + 0.45, 0.0, 1.0));
        col = mix(col, vec3(0.16, 0.56, 0.54), shallow * 0.65);
        col *= 0.55 + 0.5 * max(dot(n, uSun), 0.0);
        col += vec3(0.04, 0.2, 0.18) * max(h, 0.0) * pow(max(dot(-v, uSun), 0.0), 2.0); // light through wave crests

        // Sky reflection and sun glitter.
        vec3 r = reflect(-v, n);
        r.y = abs(r.y);
        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
        col = mix(col, sky(r), fres * 0.7);
        col += vec3(1.0, 0.82, 0.58) * pow(max(dot(r, uSun), 0.0), 420.0) * 1.6;

        // Ship-local position: lx to starboard, lz toward the stern.
        vec2 sd = p - uShip.xy;
        float lx = sd.x * uShip.z - sd.y * uShip.w, lz = sd.x * uShip.w + sd.y * uShip.z;
        float hull = length(max(vec2(abs(lx) - 4.4, abs(lz + 1.0) - 21.5), 0.0));
        col *= 1.0 - 0.4 * smoothstep(7.0, 0.0, hull); // contact shadow

        float breakup = 0.55 + 0.45 * sin(rip.x * 2.1 + rip.y * 1.7);
        float power = clamp(uSpeed / 18.0, 0.0, 1.6);

        float aft = lz - 20.0;                                   // churned water astern
        float churn = step(0.0, aft) * smoothstep(4.0 + aft * 0.1, 1.0 + aft * 0.03, abs(lx)) * exp(-aft / 90.0);
        float fromBow = lz + 22.0;                               // V-shaped bow waves
        float arm = abs(abs(lx) - (4.2 + fromBow * 0.32));
        float arms = step(0.0, fromBow) * smoothstep(1.2 + fromBow * 0.03, 0.0, arm) * exp(-fromBow / 70.0);

        float foam = smoothstep(1.15, 1.7, h) * 0.25;                                     // wave crests
        foam += smoothstep(8.0, 0.0, shore) * smoothstep(0.5, 0.9, 0.5 + 0.5 * sin(shore * 1.5 - uTime * 1.4 + sin(p.y * 0.2) * 2.0)); // surf lines
        foam += smoothstep(1.6, 0.0, shore);                                              // wet edge
        foam += smoothstep(2.2, 0.2, hull) * (0.4 + 0.6 * power) * breakup;               // hull wash
        foam += (churn * 0.9 + arms * 0.6) * power * breakup;
        col = mix(col, vec3(0.93, 0.96, 1.0), clamp(foam, 0.0, 1.0));

        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uFog, smoothstep(uNear, uFar, dist));
      }`,
  });

  const mesh = new THREE.Mesh(lodGrid(...(IS_TOUCH ? [64, 84] : [88, 112])), material);
  mesh.frustumCulled = false;
  scene.add(mesh);
  return { mesh, material };
}
