import * as THREE from 'three';

/**
 * GPU-simulated point sprites in a ring buffer.
 * A particle's launch state is written once at spawn; the vertex shader integrates
 * its motion from its age. Per frame the CPU only uploads the slots spawned that frame.
 */
export class Particles {
  constructor(scene, max, additive) {
    this.max = max;
    this.i = 0;
    this.time = 0;
    this.dirtyMin = Infinity;
    this.dirtyMax = -1;

    this.pos = new Float32Array(max * 3); // spawn position
    this.vel = new Float32Array(max * 4); // velocity xyz, lifetime
    this.col = new Float32Array(max * 4); // rgb, peak alpha
    this.par = new Float32Array(max * 4); // size, growth, gravity, drag
    this.t0 = new Float32Array(max);      // spawn time

    const g = new THREE.BufferGeometry();
    this.attrs = [['position', this.pos, 3], ['aVel', this.vel, 4], ['aCol', this.col, 4], ['aPar', this.par, 4], ['aT0', this.t0, 1]]
      .map(([name, array, size]) => {
        const a = new THREE.BufferAttribute(array, size);
        a.setUsage(THREE.DynamicDrawUsage);
        g.setAttribute(name, a);
        return a;
      });

    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 600 }, uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute vec4 aVel;
        attribute vec4 aCol;
        attribute vec4 aPar;
        attribute float aT0;
        uniform float uScale, uTime;
        varying vec4 vC;
        void main() {
          float life = aVel.w, age = uTime - aT0;
          if (age < 0.0 || age >= life) {
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            gl_PointSize = 0.0;
            return;
          }

          // Closed-form motion under linear drag k and gravity g.
          float k = aPar.w;
          float f = k > 0.01 ? (1.0 - exp(-k * age)) / k : age;
          float fall = k > 0.01 ? (age - f) / k : 0.5 * age * age;
          vec3 p = position + aVel.xyz * f;
          p.y -= aPar.z * fall;

          float left = 1.0 - age / life;
          vC = vec4(aCol.rgb, aCol.a * min(1.0, left * 1.5) * min(1.0, (1.0 - left) * 8.0 + 0.2));

          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = max(aPar.x + aPar.y * age, 0.0) * uScale / max(-mv.z, 0.1);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying vec4 vC;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          gl_FragColor = vec4(vC.rgb, vC.a * smoothstep(0.5, 0.1, d));
        }`,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });

    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  spawn(x, y, z, vx, vy, vz, r, g, b, size, life, grow = 0, grav = 0, drag = 0, alpha = 1) {
    const i = this.i, i3 = i * 3, i4 = i * 4;
    this.i = (i + 1) % this.max;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i4] = vx; this.vel[i4 + 1] = vy; this.vel[i4 + 2] = vz; this.vel[i4 + 3] = life;
    this.col[i4] = r; this.col[i4 + 1] = g; this.col[i4 + 2] = b; this.col[i4 + 3] = alpha;
    this.par[i4] = size; this.par[i4 + 1] = grow; this.par[i4 + 2] = grav; this.par[i4 + 3] = drag;
    this.t0[i] = this.time;
    if (i < this.dirtyMin) this.dirtyMin = i;
    if (i > this.dirtyMax) this.dirtyMax = i;
  }

  // Advances the clock and uploads only the slots written since the last call.
  update(time) {
    this.time = time;
    this.mat.uniforms.uTime.value = time;
    if (this.dirtyMax < 0) return;
    for (const a of this.attrs) {
      a.clearUpdateRanges();
      a.addUpdateRange(this.dirtyMin * a.itemSize, (this.dirtyMax - this.dirtyMin + 1) * a.itemSize);
      a.needsUpdate = true;
    }
    this.dirtyMin = Infinity;
    this.dirtyMax = -1;
  }

  alive() {
    let n = 0;
    for (let i = 0; i < this.max; i++) if (this.t0[i] + this.vel[i * 4 + 3] > this.time) n++;
    return n;
  }

  clear() {
    for (let i = 0; i < this.max; i++) this.vel[i * 4 + 3] = 0;
    this.dirtyMin = 0;
    this.dirtyMax = this.max - 1;
  }
}
