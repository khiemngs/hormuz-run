import { G } from './game/state.js';

const KEYMAP = { arrowup: 'w', arrowdown: 's', arrowleft: 'a', arrowright: 'd' };
const normalize = e => KEYMAP[e.key.toLowerCase()] || e.key.toLowerCase();

// Held keys go to G.keys; one-shot actions fire on keydown.
export function initInput(actions) {
  addEventListener('keydown', e => {
    const k = normalize(e);
    G.keys[k] = true;
    if (k === ' ' || e.key.startsWith('Arrow')) e.preventDefault();
    if (e.repeat) return;

    if (k === '`') actions.toggleTech();
    if (k === 'm') actions.toggleMute();
    if (G.mode === 'play') {
      if (k === ' ') actions.flare();
      if (k === 'h') actions.horn();
      if (k === 'p' || k === 'escape') actions.pause();
    } else if (k === 'enter' && actions.canStart()) {
      actions.start();
    }
  });
  addEventListener('keyup', e => { G.keys[normalize(e)] = false; });
  addEventListener('blur', () => { for (const k in G.keys) G.keys[k] = false; });
}
