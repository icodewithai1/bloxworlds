// BloxWorlds — hub page: profile, 3D avatar preview, live server directory
import * as THREE from 'three';
import { Database } from '../engine/Database.js';
import { ServerDirectory } from '../engine/ServerDirectory.js';
import { Avatar } from '../engine/Avatar.js';
import { escapeHtml } from '../engine/Engine.js';

const db = new Database();

const uname = document.getElementById('uname');
const randBtn = document.getElementById('randlook');
const statsEl = document.getElementById('stats');
const navUser = document.getElementById('navuser');

uname.value = db.name;
navUser.textContent = db.name;
uname.addEventListener('input', () => {
  db.name = uname.value.trim() || db.name;
  navUser.textContent = db.name;
});

// ---------------- 3D avatar preview ----------------
const avCanvas = document.getElementById('avcanvas');
let avatar = null;
(function initPreview() {
  if (!avCanvas) return;
  const renderer = new THREE.WebGLRenderer({ canvas: avCanvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(150, 190, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(32, 150 / 190, 0.1, 50);
  cam.position.set(0, 1.9, 6.4);
  cam.lookAt(0, 1.35, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const key = new THREE.DirectionalLight(0xfff4e0, 2.2);
  key.position.set(2, 4, 3);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ecfff, 1.0);
  rim.position.set(-3, 2, -2);
  scene.add(rim);

  const setAvatar = () => {
    if (avatar) scene.remove(avatar.group);
    avatar = new Avatar(db.look);
    scene.add(avatar.group);
  };
  setAvatar();
  window.__setAvatar = setAvatar;

  let last = performance.now();
  (function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (avatar) {
      avatar.group.rotation.y += dt * 0.8;
      avatar.animate(dt, 0, true); // idle sway
    }
    renderer.render(scene, cam);
  })(last);
})();

randBtn.addEventListener('click', () => {
  db.randomizeLook();
  if (window.__setAvatar) window.__setAvatar();
});

// ---------------- stats ----------------
function statLine() {
  const o = db.stats('obby'), s = db.stats('speedrun');
  const fmt = (x) => (x.plays ? `${x.wins}W · best ${x.bestTime !== null ? x.bestTime + 's' : '—'}` : 'not played');
  statsEl.innerHTML = `🏁 Obby: <b>${fmt(o)}</b> &nbsp;·&nbsp; ⚡ Speedrunners: <b>${fmt(s)}</b>`;
}
statLine();

// ---------------- live server directory ----------------
const srvList = document.getElementById('srvlist');
const srvEmpty = document.getElementById('srvempty');
const joinCode = document.getElementById('joincode');
const joinBtn = document.getElementById('joinbtn');

const GAME_PAGES = { obby: 'obby.html', speedrun: 'speedrun.html' };
const GAME_NAMES = { obby: 'Mega Obby', speedrun: 'Speedrunners' };
const GAME_ICONS = { obby: '🏁', speedrun: '⚡' };

function render(servers) {
  if (!srvList) return;
  srvList.innerHTML = '';
  const live = servers.filter((s) => GAME_PAGES[s.game]);
  srvEmpty.style.display = live.length ? 'none' : 'block';
  for (const s of live) {
    const row = document.createElement('div');
    row.className = 'srv';
    row.innerHTML =
      `<div class="srv-ico">${GAME_ICONS[s.game] || '🎮'}</div>` +
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
