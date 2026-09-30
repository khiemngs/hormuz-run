const KEY = 'hormuz-best';

// Storage can throw in private windows, so both calls fail quietly.
export function loadBest() {
  try { return Number(localStorage.getItem(KEY)) || 0; } catch { return 0; }
}

export function saveBest(score) {
  try { if (score > loadBest()) localStorage.setItem(KEY, score); } catch { /* ignore */ }
}
