// BloxWorlds Engine — GameUI: loading screen, Roblox-inspired top bar,
// escape menu (Resume/Respawn/Leave), and player-list leaderboard panel.

export function injectGameChrome() {
  const div = document.createElement('div');
  div.innerHTML = `
  <div id="loadscreen">
    <img src="assets/icon.png" alt="">
    <div id="load-title">BloxWorlds</div>
    <div id="load-game"></div>
    <div id="load-bar"><i></i></div>
    <div id="load-tip"></div>
  </div>
  <div id="topbar-game">
    <button id="menubtn" aria-label="Menu">
      <span></span><span></span><span></span>
    </button>
    <div id="hud"></div>
    <div id="topbar-right">
      <div id="conn" class="off">●</div>
      <button id="plistbtn" aria-label="Players">👥</button>
    </div>
  </div>
  <div id="plist"><div id="plist-head">Players</div><div id="plist-rows"></div></div>
  <div id="msg"></div>
  <div id="chat">
    <div id="chatlog"></div>
    <input id="chatin" maxlength="140" placeholder="Say something…">
  </div>
  <div id="joy"><div id="joyknob"></div></div>
  <button id="jumpbtn">JUMP</button>
  <button id="chatbtn">💬</button>
  <div id="menu-overlay">
    <div id="menu-card">
      <div id="menu-head">
        <img src="assets/icon.png" alt="">
        <div>
          <div id="menu-title">BloxWorlds</div>
          <div id="menu-sub">Menu</div>
        </div>
      </div>
      <button class="menu-item" id="menu-resume">▶ &nbsp;Resume</button>
      <button class="menu-item" id="menu-respawn">🔄 &nbsp;Respawn Character</button>
      <button class="menu-item danger" id="menu-leave">🚪 &nbsp;Leave Game</button>
      <div id="menu-foot">Esc toggles this menu</div>
    </div>
  </div>`;
  while (div.firstChild) document.body.appendChild(div.firstChild);
}

const TIPS = [
  'Tip: drag the screen to look around!',
  'Tip: share your server code so friends can join you.',
  'Tip: press R to respawn at your checkpoint.',
  'Tip: yellow pads are checkpoints — touch them!',
  'Tip: press Enter to chat with other players.'
];

export function showLoading(gameName) {
  const ls = document.getElementById('loadscreen');
  if (!ls) return () => {};
  document.getElementById('load-game').textContent = gameName;
  document.getElementById('load-tip').textContent = TIPS[(Math.random() * TIPS.length) | 0];
  let done = false;
  // finish: fade out
  return () => {
    if (done) return;
    done = true;
    ls.classList.add('done');
    setTimeout(() => ls.remove(), 650);
  };
}

export function setupGameMenu({ onRespawn, gameName = 'BloxWorlds' }) {
  const menuBtn = document.getElementById('menubtn');
  const overlay = document.getElementById('menu-overlay');
  const resumeBtn = document.getElementById('menu-resume');
  const respawnBtn = document.getElementById('menu-respawn');
  const leaveBtn = document.getElementById('menu-leave');
  const title = document.getElementById('menu-title');
  if (!menuBtn || !overlay) return { open: () => {}, close: () => {} };

  if (title) title.textContent = gameName;

  let open = false;
  const setOpen = (v) => {
    open = v;
    overlay.style.display = v ? 'flex' : 'none';
    menuBtn.classList.toggle('active', v);
  };

  const toggle = (e) => { if (e) e.preventDefault(); setOpen(!open); };
  menuBtn.addEventListener('click', toggle);
  menuBtn.addEventListener('touchstart', toggle, { passive: false });

  resumeBtn.addEventListener('click', () => setOpen(false));
  respawnBtn.addEventListener('click', () => { setOpen(false); onRespawn && onRespawn(); });
  leaveBtn.addEventListener('click', () => { location.href = 'index.html'; });

  overlay.addEventListener('click', (e) => { if (e.target === overlay) setOpen(false); });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      const chatin = document.getElementById('chatin');
      if (chatin && chatin.style.display === 'block') return;
      toggle(e);
    }
  });

  return { open: () => setOpen(true), close: () => setOpen(false) };
}

// Roblox-style player list (top-right toggle). rows: [{name, stat, me}]
export function setupPlayerList() {
  const btn = document.getElementById('plistbtn');
  const panel = document.getElementById('plist');
  const rowsEl = document.getElementById('plist-rows');
  if (!btn || !panel) return { update: () => {} };

  let open = false;
  const toggle = (e) => {
    if (e) e.preventDefault();
    open = !open;
    panel.style.display = open ? 'block' : 'none';
    btn.classList.toggle('active', open);
  };
  btn.addEventListener('click', toggle);
  btn.addEventListener('touchstart', toggle, { passive: false });

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  return {
    update(rows) {
      if (!open) return;
      rowsEl.innerHTML = rows.map((r) =>
        `<div class="plist-row${r.me ? ' me' : ''}"><span class="pl-name">${esc(r.name)}</span><span class="pl-stat">${esc(r.stat ?? '')}</span></div>`
      ).join('');
    }
  };
}
