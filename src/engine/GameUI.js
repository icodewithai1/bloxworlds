// BloxWorlds Engine — GameUI: Roblox-inspired in-game top bar + escape menu.
// Top-left menu button (works on desktop AND mobile) opens a centered menu:
// Resume / Respawn / Leave Game. Esc key toggles it too.
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
      if (chatin && chatin.style.display === 'block') return; // chat esc handled elsewhere
      toggle(e);
    }
  });

  return { open: () => setOpen(true), close: () => setOpen(false) };
}

// Standard in-game page markup injector — keeps HTML files tiny and identical.
export function injectGameChrome() {
  const div = document.createElement('div');
  div.innerHTML = `
  <div id="topbar-game">
    <button id="menubtn" aria-label="Menu">
      <span></span><span></span><span></span>
    </button>
    <div id="hud"></div>
    <div id="conn" class="off">●</div>
  </div>
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
