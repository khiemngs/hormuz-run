import * as THREE from 'three';

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function textSprite(text, w, h, font, color = '#fff', bg = null) {
  const map = canvasTexture(w, h, g => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    g.font = font;
    g.fillStyle = color;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 4);
  });
  return new THREE.Sprite(new THREE.SpriteMaterial({ map, depthWrite: false }));
}

export const emojiTexture = emoji => canvasTexture(128, 128, g => {
  g.font = '96px serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(emoji, 64, 72);
});
