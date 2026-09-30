import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1, ...opts });

// Every vertex-coloured model shares this material, and so one shader program.
export const MODEL_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.08 });

const c = new THREE.Color();

// Returns a non-indexed copy of `geo` with a flat vertex colour, ready to merge.
export function paint(geo, hex) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv');
  const n = g.attributes.position.count, col = new Float32Array(n * 3);
  c.setHex(hex);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

export const pbox = (w, h, d, hex, x = 0, y = 0, z = 0) => paint(new THREE.BoxGeometry(w, h, d), hex).translate(x, y, z);
export const pcyl = (rTop, rBot, h, seg, hex, x = 0, y = 0, z = 0) => paint(new THREE.CylinderGeometry(rTop, rBot, h, seg), hex).translate(x, y, z);

// Box whose top face is scaled by (topX, topZ), for sloped superstructures and funnels.
export function ptaper(w, h, d, topX, topZ, hex, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) > 0) { p.setX(i, p.getX(i) * topX); p.setZ(i, p.getZ(i) * topZ); }
  }
  return paint(g, hex).translate(x, y, z);
}

// Merges painted parts into one geometry. Non-indexed, so normals come out flat per face.
export function merged(parts) {
  const g = mergeGeometries(parts);
  g.computeVertexNormals();
  return g;
}

/**
 * Lofted ship hull. Bow points -z, stern sits at +length/2.
 * `levels` run keel to deck: { y, w (width factor), color (of the band above) }.
 * The bow tapers to a point; lower levels are narrower (flare) and set back (rake).
 */
export function loftHull({
  length, beam, levels, deckColor,
  bow = 0.3, stern = 0.1, sternW = 0.8, rake = 0, sheer = 0, flare = 0.6, bowPow = 0.7, segments = 20,
}) {
  const top = levels.length - 1, pos = [], col = [];

  const pt = (t, j, side) => {
    const u = Math.max(0, (t - (1 - bow)) / bow), lf = j / top;
    const aft = t < stern ? sternW + (1 - sternW) * Math.sin((Math.PI / 2) * (t / stern)) : 1;
    const w = (beam / 2) * levels[j].w * aft * Math.pow(Math.max(0, 1 - u * u), bowPow) * (1 - (1 - lf) * flare * u);
    return [side * w, levels[j].y + (j === top ? sheer * u * u : 0), length / 2 - t * length + (1 - lf) * rake * u * u];
  };
  const tri = (a, b, d, hex) => {
    pos.push(...a, ...b, ...d);
    c.setHex(hex);
    for (let i = 0; i < 3; i++) col.push(c.r, c.g, c.b);
  };
  const quad = (a, b, d, e, hex) => { tri(a, b, d, hex); tri(a, d, e, hex); };

  for (let i = 0; i < segments; i++) {
    const t0 = i / segments, t1 = (i + 1) / segments;
    for (let j = 0; j < top; j++) {
      quad(pt(t0, j, 1), pt(t1, j, 1), pt(t1, j + 1, 1), pt(t0, j + 1, 1), levels[j].color);     // starboard
      quad(pt(t0, j, -1), pt(t0, j + 1, -1), pt(t1, j + 1, -1), pt(t1, j, -1), levels[j].color); // port
    }
    quad(pt(t0, top, -1), pt(t0, top, 1), pt(t1, top, 1), pt(t1, top, -1), deckColor);           // deck
    quad(pt(t0, 0, -1), pt(t1, 0, -1), pt(t1, 0, 1), pt(t0, 0, 1), levels[0].color);             // keel
  }
  for (let j = 0; j < top; j++) quad(pt(0, j, -1), pt(0, j, 1), pt(0, j + 1, 1), pt(0, j + 1, -1), levels[j].color); // transom

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}
