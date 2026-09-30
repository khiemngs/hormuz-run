// Shared mutable game state. Systems read and write it directly.
export const G = {
  mode: 'menu', // menu | play | sinking | win | dead | over
  paused: false,
  time: 0,
  playTime: 0,
  score: 0,
  shake: 0,
  sinkT: 0,
  lockedOn: false,
  keys: {},
  ship: {},
  cargo: [],
  dir: {},
  stats: {},

  // Live entities, rebuilt on every restart.
  shells: [],
  crosses: [],
  homings: [],
  boats: [],
  bullets: [],
  flares: [],
  mines: [],
  pickups: [],
  debris: [],
  shockwaves: [],
};

const LISTS = ['shells', 'crosses', 'homings', 'boats', 'bullets', 'flares', 'mines', 'pickups', 'debris', 'shockwaves'];

export function resetState() {
  for (const key of LISTS) G[key] = [];
  Object.assign(G, { score: 0, playTime: 0, shake: 0, sinkT: 0, lockedOn: false, paused: false });
  G.stats = { hits: 0, closeCalls: 0, rammed: 0, needles: 0 };
}
