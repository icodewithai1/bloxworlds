// BloxWorlds — hub page: profile, 3D avatar preview, live server directory
import {
  Engine as BEngine, Scene, Vector3, Color3, Color4, FreeCamera,
  DirectionalLight, HemisphericLight
} from '../engine/blox3d.js';
import * as Account from '../engine/Account.js';
import { Database } from '../engine/Database.js';
import { ServerDirectory } from '../engine/ServerDirectory.js';
import { Avatar } from '../engine/Avatar.js';
import { escapeHtml } from '../engine/Engine.js';

const db = new Database();

// ---------------- splash + auth flow ----------------
(function splashAndAuth() {
  const splash = document.getElementById('splash');
  const auth = document.getElementById('auth');
  if (!splash) return;

  setTimeout(() => {
    splash.classList.add('done');
    setTimeout(() => splash.remove(), 600);
    const acc = Account.currentAccount();
    if (acc) {
      db.name = acc.username;
      applyAccount(acc);
    } else if (!localStorage.getItem('bw_guest_ok')) {
      auth.style.display = 'flex';
    }
  }, 1400);

  const tabL = document.getElementById('tab-login');
  const tabS = document.getElementById('tab-signup');
  const extra = document.getElementById('signup-extra');
  const submit = document.getElementById('a-submit');
  const err = document.getElementById('a-error');
  let mode = 'login';

  const setMode = (m) => {
    mode = m;
    tabL.classList.toggle('on', m === 'login');
    tabS.classList.toggle('on', m === 'signup');
    extra.style.display = m === 'signup' ? 'block' : 'none';
    submit.textContent = m === 'signup' ? 'Sign Up' : 'Log In';
    err.textContent = '';
  };
  tabL.addEventListener('click', () => setMode('login'));
  tabS.addEventListener('click', () => setMode('signup'));

  submit.addEventListener('click', async () => {
    err.textContent = '';
    const username = document.getElementById('a-user').value;
    const password = document.getElementById('a-pass').value;
    const birthdate = document.getElementById('a-birth').value;
    try {
      const acc = mode === 'signup'
        ? await Account.signUp({ username, password, birthdate })
        : await Account.logIn({ username, password });
      db.name = acc.username;
      applyAccount(acc);
      auth.style.display = 'none';
    } catch (e) {
      err.textContent = e.message;
    }
  });

  document.getElementById('a-guest').addEventListener('click', () => {
    localStorage.setItem('bw_guest_ok', '1');
    auth.style.display = 'none';
  });

  function applyAccount(acc) {
    const uEl = document.getElementById('uname');
    const nEl = document.getElementById('navuser');
    if (uEl) uEl.value = acc.username;
    if (nEl) nEl.textContent = acc.username + ' · ' + Account.ageFromBirthdate(acc.birthdate) + 'y';
  }
})();

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

// ---------------- 3D avatar preview (Babylon.js) ----------------
const avCanvas = document.getElementById('avcanvas');
let avatar = null;
(function initPreview() {
  if (!avCanvas) return;
  const beng = new BEngine(avCanvas, true, { alpha: true }, true);
  const scene = new Scene(beng);
  scene.clearColor = new Color4(0, 0, 0, 0);

  const cam = new FreeCamera('pcam', new Vector3(0, 1.9, 6.4), scene);
  cam.setTarget(new Vector3(0, 1.35, 0));
  cam.fov = 0.56;
  cam.inputs.clear();

  const hemi = new HemisphericLight('ph', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.75;
  const key = new DirectionalLight('pk', new Vector3(-0.4, -0.7, -0.6), scene);
  key.intensity = 1.4;
  key.diffuse = new Color3(1, 0.96, 0.88);

  // minimal engine shim: Avatar only needs .scene and .addShadows()
  const engineShim = { scene, addShadows: (m) => m };

  const setAvatar = () => {
    if (avatar) avatar.dispose();
    avatar = new Avatar(engineShim, db.look);
  };
  setAvatar();
  window.__setAvatar = setAvatar;

  let last = performance.now();
  beng.runRenderLoop(() => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (avatar) {
      avatar.group.rotation.y += dt * 0.8;
      avatar.animate(dt, 0, true);
    }
    scene.render();
  });
})();

randBtn.addEventListener('click', () => {
  db.randomizeLook();
  if (window.__setAvatar) window.__setAvatar();
});

// ---------------- stats ----------------
function statLine() {
  const o = db.stats('obby'), s = db.stats('speedrun');
  const fmt = (x) => (x.plays ? `${x.wins}W · best ${x.bestTime !== null ? x.bestTime + 's' : '—'}` : 'not played');
  const f = db.stats('flood');
  statsEl.innerHTML = `🏁 Obby: <b>${fmt(o)}</b> · ⚡ Speedrunners: <b>${fmt(s)}</b> · 🌊 Flood!: <b>${fmt(f)}</b>`;
}
statLine();

// ---------------- live server directory ----------------
const srvList = document.getElementById('srvlist');
const srvEmpty = document.getElementById('srvempty');
const joinCode = document.getElementById('joincode');
const joinBtn = document.getElementById('joinbtn');

const GAME_PAGES = { obby: 'obby.html', speedrun: 'speedrun.html', flood: 'flood.html' };
const GAME_NAMES = { obby: 'Mega Obby', speedrun: 'Speedrunners', flood: 'Flood!' };
const GAME_ICONS = { obby: '🏁', speedrun: '⚡', flood: '🌊' };

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
