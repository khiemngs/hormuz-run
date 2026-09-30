import * as THREE from 'three';

export const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1, ...opts });

// Extrudes a top-view shape upward. Shape +y becomes world -z (forward).
export function extrude(shape, depth, y) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

export function box(w, h, d, material, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function castShadows(root) {
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return root;
}
