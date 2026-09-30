import { $ } from '../utils/dom.js';
import { loadBest } from '../utils/storage.js';

function show(html, onButton) {
  $('card').innerHTML = html;
  $('screen').style.display = 'flex';
  $('go').onclick = onButton;
}

export const hideScreen = () => ($('screen').style.display = 'none');
export const isScreenOpen = () => $('screen').style.display !== 'none';

export function showMenu(onStart) {
  const best = loadBest();
  show(`
    <h1>HORMUZ RUN</h1>
    <div class="tag">one container ship · two navies · zero chill</div>
    <p>You captain the <b>MV Ever Dodging</b>, a very large, very slow container ship.
       The US Navy and Iran are fighting over the Strait of Hormuz, and you are right in the middle.
       Get your cargo to the Gulf of Oman.</p>
    <div class="grid">
      <kbd>W / S</kbd><span>Throttle. She's heavy, so plan ahead.</span>
      <kbd>A / D</kbd><span>Rudder. Turning takes a while too.</span>
      <kbd>Space</kbd><span>Launch flares to decoy homing missiles</span>
      <kbd>H</kbd><span>Ship horn scares off IRGC fast boats</span>
      <span>🔴 Red circles</span><span>Incoming artillery. Don't be there when it lands.</span>
      <span>➤ Red lanes</span><span>A missile is about to cross the strait. Slow down or speed through.</span>
      <span>💥 Fast boats</span><span>Ram them with your 200,000 tons for bonus points</span>
      <span>🔧⚡🛡️🎆💰</span><span>Repair, turbo, neutral-flag shield, flares, bonus cargo</span>
    </div>
    ${best ? `<p style="opacity:.7">Best score: ${best.toLocaleString()}</p>` : ''}
    <button id="go">SET SAIL</button>`, onStart);
}

export function showEndScreen(r, onRestart) {
  const st = r.stats;
  show(`
    <h1 style="color:${r.won ? '#4be37a' : '#ff4b3a'}">${r.won ? 'DELIVERED!' : 'SUNK'}</h1>
    <div class="tag">${r.won ? 'the insurance company weeps with joy' : `went down ${r.remainingNm.toFixed(1)} nm from safety`}</div>
    <div class="grid">
      <span>Distance</span><b>${r.distNm.toFixed(1)} / 40 nm</b>
      <span>Containers saved</span><b>${r.cargo} / ${r.cargoMax}${r.won ? ` (+${r.cargoBonus})` : ''}</b>
      ${r.won ? `<span>Hull bonus</span><b>+${r.hullBonus}</b>` : ''}
      <span>Close calls</span><b>${st.closeCalls}</b>
      <span>Needles threaded</span><b>${st.needles}</b>
      <span>Fast boats rammed</span><b>${st.rammed}</b>
      <span>Hits taken</span><b>${st.hits}</b>
      <span style="font-size:22px">Final score</span><b style="font-size:22px;color:var(--amber)">${r.total.toLocaleString()}</b>
      <span>Best</span><b>${r.best.toLocaleString()}</b>
    </div>
    <button id="go">${r.won ? 'SAIL AGAIN' : 'TRY AGAIN'}</button>`, onRestart);
}
