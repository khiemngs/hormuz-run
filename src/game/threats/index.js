import { updateShells } from './artillery.js';
import { updateCrossfire, updateHoming } from './missiles.js';
import { updateBoats, updateBullets } from './boats.js';

export function updateThreats(dt) {
  updateShells(dt);
  updateCrossfire(dt);
  updateHoming(dt);
  updateBoats(dt);
  updateBullets(dt);
}
