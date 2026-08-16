// BloxWorlds — hub page logic
import { Database } from '../engine/Database.js';

const db = new Database();

const uname = document.getElementById('uname');
const avPrev = document.getElementById('avprev');
const randBtn = document.getElementById('randlook');
const statsEl = document.getElementById('stats');

uname.value = db.name;
uname.addEventListener('input', () => {
  db.name = uname.value.trim() || db.name;
});

function drawPreview() {
  const l = db.look;
  const hex = (n) => '#' + n.toString(16).padStart(6, '0');
  avPrev.innerHTML =
    `<div class="av"><div class="av-head" style="background:${hex(l.skin)}"></div>` +
    `<div class="av-torso" style="background:${hex(l.body)}"></div>` +
    `<div class="av-legs"><i style="background:${hex(l.pants)}"></i><i style="background:${hex(l.pants)}"></i></div></div>`;
}
drawPreview();

randBtn.addEventListener('click', () => {
  db.randomizeLook();
  drawPreview();
});

const s = db.stats('obby');
statsEl.innerHTML = s.plays
  ? `Plays: <b>${s.plays}</b> · Wins: <b>${s.wins}</b> · Best time: <b>${s.bestTime !== null ? s.bestTime + 's' : '—'}</b> · Best stage: <b>${s.bestStage}</b>`
  : 'No plays yet — jump in!';

document.getElementById('playObby').addEventListener('click', (e) => {
  if (e.target.tagName !== 'A') window.location.href = 'obby.html';
});
