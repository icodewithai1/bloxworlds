// BloxWorlds — hub page logic
import { Database } from '../engine/Database.js';
import { ServerDirectory } from '../engine/ServerDirectory.js';
import { escapeHtml } from '../engine/Engine.js';

const db = new Database();

const uname = document.getElementById('uname');
const avPrev = document.getElementById('avprev');
const randBtn = document.getElementById('randlook');
const statsEl = document.getElementById('stats');
const navUser = document.getElementById('navuser');

uname.value = db.name;
navUser.textContent = db.name;
uname.addEventListener('input', () => {
  db.name = uname.value.trim() || db.name;
  navUser.textContent = db.name;
});

function drawPreview() {
  const l = db.look;
  const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');
  avPrev.innerHTML =
    `<div class="av">` +
    `<div class="av-hair" style="background:${hex(l.hair ?? 0x7a4a21)}"></div>` +
    `<div class="av-head" style="background:${hex(l.skin ?? 0xf3f3f3)}"></div>` +
    `<div class="av-torso" style="background:linear-gradient(90deg, ${hex(l.jacket ?? 0x17181a)} 26%, ${hex(l.shirt ?? 0x1f7fd1)} 26%, ${hex(l.shirt ?? 0x1f7fd1)} 74%, ${hex(l.jacket ?? 0x17181a)} 74%)"></div>` +
    `<div class="av-legs"><i style="background:${hex(l.pants ?? 0x2a332a)}"></i><i style="background:${hex(l.pants ?? 0x2a332a)}"></i></div></div>`;
}
drawPreview();

randBtn.addEventListener('click', () => {
  db.randomizeLook();
  drawPreview();
});

const s = db.stats('obby');
statsEl.innerHTML = s.plays
  ? `Plays: <b>${s.plays}</b> · Wins: <b>${s.wins}</b> · Best time: <b>${s.bestTime !== null ? s.bestTime + 's' : '—'}</b> · Best stage: <b>${s.bestStage}</b>`
  : 'No plays yet — jump into a game!';

// ---------------- live server directory (shared P2P database) ----------------
const srvList = document.getElementById('srvlist');
const srvEmpty = document.getElementById('srvempty');
const joinCode = document.getElementById('joincode');
const joinBtn = document.getElementById('joinbtn');

const GAME_PAGES = { obby: 'obby.html' };
const GAME_NAMES = { obby: 'Mega Obby' };

function render(servers) {
  if (!srvList) return;
  srvList.innerHTML = '';
  const live = servers.filter((s) => GAME_PAGES[s.game]);
  srvEmpty.style.display = live.length ? 'none' : 'block';
  for (const s of live) {
    const row = document.createElement('div');
    row.className = 'srv';
    row.innerHTML =
      `<div class="srv-ico">🏁</div>` +
      `<div class="srv-info"><div class="srv-name">${escapeHtml(GAME_NAMES[s.game] || s.game)} <span class="srv-code">${escapeHtml(s.code)}</span></div>` +
      `<div class="srv-sub">Host: ${escapeHtml(s.host)} · ${s.players} playing</div></div>` +
      `<a class="btn small" href="${GAME_PAGES[s.game]}?server=${encodeURIComponent(s.code)}">Join</a>`;
    srvList.appendChild(row);
  }
}

try {
  const dir = new ServerDirectory();
  if (!dir.dead) {
    dir.onUpdate = render;
    render(dir.list());
  } else {
    srvEmpty.textContent = 'Server list unavailable (P2P blocked on this network).';
  }
} catch (e) {
  if (srvEmpty) srvEmpty.textContent = 'Server list unavailable (P2P blocked on this network).';
}

if (joinBtn) {
  joinBtn.addEventListener('click', () => {
    const code = (joinCode.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    if (code) location.href = 'obby.html?server=' + code;
  });
  joinCode.addEventListener('keydown', (e) => { if (e.key === 'Enter') joinBtn.click(); });
}
