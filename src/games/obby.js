// BloxWorlds — Mega Obby (built on the BloxWorlds engine + Trystero P2P)
import * as THREE from 'three';
import {
  Engine, World, Player, RemotePlayer, Input, Network, Database, escapeHtml
} from '../engine/index.js';

const GAME_ID = 'obby';
const RAINBOW = [0xe2231a, 0xff8f00, 0xfdd835, 0x43a047, 0x1e88e5, 0x8e24aa];

// ------------------------------------------------------------------ setup
const db = new Database();
const engine = new Engine(document.getElementById('c'));
engine.addClouds();
const world = new World(engine);
const input = new Input(engine.canvas);

// ------------------------------------------------------------------ map
function buildMap() {
  const P = (o) => world.addPart(o);

  // spawn island
  P({ x: 0, y: 0.5, z: 0, w: 22, h: 1, d: 22, color: 0x43a047 });
  P({ x: 0, y: 1.25, z: -8, w: 6, h: 0.5, d: 3, color: 0x8d6e63 });

  let x = 0, y = 1, z = -14;

  // 1: rainbow hops
  for (let i = 0; i < 7; i++) {
    z -= 5; y += 0.4;
    x = Math.sin(i * 1.1) * 4;
    P({ x, y, z, w: 3.4, h: 1, d: 3.4, color: RAINBOW[i % 6] });
  }
  P({ x, y: y + 0.75, z: z - 5, w: 4, h: 0.5, d: 4, color: 0xffee58, kind: 'checkpoint', extra: { n: 1 } });
  z -= 5;

  // 2: kill bricks
  for (let i = 0; i < 6; i++) {
    z -= 4.5;
    const safe = i % 2 === 0;
    P({ x: 0, y: y + 0.5, z, w: 3.2, h: 1, d: 3.2, color: safe ? 0x1e88e5 : 0xd32f2f, kind: safe ? 'solid' : 'kill' });
    if (!safe) P({ x: 6, y: y + 0.5, z, w: 3.2, h: 1, d: 3.2, color: 0x1e88e5 });
  }
  P({ x: 0, y: y + 1.25, z: z - 5, w: 4, h: 0.5, d: 4, color: 0xffee58, kind: 'checkpoint', extra: { n: 2 } });
  z -= 5;

  // 3: movers
  for (let i = 0; i < 4; i++) {
    z -= 7;
    P({ x: 0, y: y + 1, z, w: 3, h: 0.8, d: 3, color: 0xff8f00, kind: 'mover', extra: { axis: 'x', amp: 5.5, speed: 0.9 + i * 0.25, off: i * 1.7 } });
  }
  P({ x: 0, y: y + 1.75, z: z - 6, w: 4, h: 0.5, d: 4, color: 0xffee58, kind: 'checkpoint', extra: { n: 3 } });
  z -= 6;

  // 4: spinner island + thin bridge
  P({ x: 0, y: y + 1, z: z - 6, w: 12, h: 1, d: 12, color: 0x8e24aa });
  P({ x: 0, y: y + 2.4, z: z - 6, w: 10, h: 0.6, d: 0.9, color: 0xd32f2f, kind: 'spinner', extra: { speed: 1.4, len: 10 } });
  z -= 15;
  for (let i = 0; i < 5; i++) {
    P({ x: 0, y: y + 1, z: z - i * 3, w: 1.1, h: 0.6, d: 3, color: RAINBOW[(i + 2) % 6] });
  }
  z -= 15;
  P({ x: 0, y: y + 1.5, z: z + 1, w: 4, h: 0.5, d: 4, color: 0xffee58, kind: 'checkpoint', extra: { n: 4 } });

  // 5: stair hops to win
  let yy = y + 1.5;
  for (let i = 0; i < 6; i++) {
    z -= 4.2; yy += 1.1;
    const sz = 3.2 - i * 0.35;
    P({ x: Math.sin(i * 2.1) * 3, y: yy, z, w: sz, h: 0.8, d: sz, color: RAINBOW[i % 6] });
  }
  z -= 6;
  P({ x: 0, y: yy + 0.5, z: z - 4, w: 14, h: 1, d: 14, color: 0xffd700, kind: 'win' });
  world.addModel(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 1.1, 2.4, 16),
      new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.25 })
    ),
    new THREE.Vector3(0, yy + 2.3, z - 4)
  );
}
buildMap();

// ------------------------------------------------------------------ player
const player = new Player(engine, world, { name: db.name, look: db.look });
db.recordPlay(GAME_ID);
const runStart = performance.now();

// ------------------------------------------------------------------ UI
const hud = document.getElementById('hud');
const connEl = document.getElementById('conn');
const msgEl = document.getElementById('msg');
const chatlog = document.getElementById('chatlog');
const chatin = document.getElementById('chatin');

let msgTimer = null;
function flash(text, color) {
  msgEl.textContent = text;
  msgEl.style.color = color || '#ffd54f';
  msgEl.style.opacity = 1;
  if (msgTimer) clearTimeout(msgTimer);
  msgTimer = setTimeout(() => { msgEl.style.opacity = 0; }, 1600);
}

function chatLine(name, text, sys) {
  const d = document.createElement('div');
  d.innerHTML = `<span class="n${sys ? ' sys' : ''}">${escapeHtml(name)}:</span> ${escapeHtml(text)}`;
  chatlog.appendChild(d);
  while (chatlog.children.length > 40) chatlog.removeChild(chatlog.firstChild);
  chatlog.scrollTop = chatlog.scrollHeight;
}

// ------------------------------------------------------------------ network (P2P)
const net = new Network(GAME_ID);
const remotes = new Map();

function setConn() {
  const n = net.peerCount;
  connEl.className = n > 0 ? 'on' : 'off';
  connEl.textContent = n > 0 ? `● P2P — ${n + 1} players` : '● Looking for players… (P2P)';
}
setConn();

net.onPeerJoin = (id, profile) => {
  remotes.set(id, new RemotePlayer(engine, profile));
  chatLine('SYSTEM', `${profile.name} joined the obby`, true);
  setConn();
};
net.onPeerLeave = (id, profile) => {
  const r = remotes.get(id);
  if (r) { r.dispose(); remotes.delete(id); }
  if (profile) chatLine('SYSTEM', `${profile.name} left`, true);
  setConn();
};
net.onState = (id, p, g, s) => {
  const r = remotes.get(id);
  if (r) r.applyState(p, g, s);
};
net.onChat = (id, text) => {
  const r = remotes.get(id);
  chatLine(r ? r.name : 'Guest', text);
};
net.onEvent = (id, kind, e) => {
  const r = remotes.get(id);
  const name = r ? r.name : 'Guest';
  if (kind === 'stage') {
    const n = Number(e.n) | 0;
    if (r && n > r.stage && n >= 1 && n <= 20) {
      r.stage = n;
      chatLine('SYSTEM', `${name} reached checkpoint ${n}!`, true);
    }
  } else if (kind === 'win') {
    chatLine('SYSTEM', `🏆 ${name} finished the obby!`, true);
  } else if (kind === 'died') {
    // quiet — could show effects
  }
};
net.join(db.name, db.look);

// ------------------------------------------------------------------ player events
player.onDeath = () => {
  flash('You died!', '#ff5252');
  db.recordDeath(GAME_ID);
  net.sendEvent('died');
};
player.onCheckpoint = (n) => {
  flash(`Checkpoint ${n}!`, '#69f0ae');
  db.recordStage(GAME_ID, n);
  net.sendEvent('stage', { n });
};
player.onWin = () => {
  const t = Math.round((performance.now() - runStart) / 100) / 10;
  const s = db.recordWin(GAME_ID, t);
  flash('🏆 YOU WIN! 🏆', '#ffd700');
  chatLine('SYSTEM', `You finished in ${t}s (best: ${s.bestTime}s, wins: ${s.wins})`, true);
  net.sendEvent('win');
};

// ------------------------------------------------------------------ chat + keys
window.addEventListener('keydown', (e) => {
  if (input.chatOpen) return;
  if (e.code === 'Enter' || e.code === 'Slash') { openChat(); e.preventDefault(); }
  if (e.code === 'KeyR') player.respawn(false);
});
document.getElementById('chatbtn')?.addEventListener('touchstart', (e) => { openChat(); e.preventDefault(); }, { passive: false });

function openChat() {
  input.chatOpen = true;
  chatin.style.display = 'block';
  setTimeout(() => chatin.focus(), 0);
}
function closeChat() {
  chatin.value = '';
  chatin.style.display = 'none';
  input.chatOpen = false;
}
chatin.addEventListener('keydown', (e) => {
  e.stopPropagation();
  if (e.code === 'Enter') {
    const v = chatin.value.trim().slice(0, 140);
    if (v) {
      chatLine(db.name, v);
      net.sendChat(v);
    }
    closeChat();
  } else if (e.code === 'Escape') closeChat();
});

// ------------------------------------------------------------------ systems
let lastNet = 0;
engine.addSystem((dt, now) => {
  player.update(dt, input);
  for (const r of remotes.values()) r.update(dt);
  player.updateCamera(input);

  if (now - lastNet > 66) {
    lastNet = now;
    net.sendState(player.pos, player.yaw, player.grounded, player.speed);
  }

  const st = db.stats(GAME_ID);
  hud.innerHTML =
    `<b>${escapeHtml(db.name)}</b><br>` +
    `Stage: ${player.stage} / 4${player.won ? ' 🏆' : ''}<br>` +
    `Deaths: ${player.deaths}<br>` +
    `Players: ${remotes.size + 1}` +
    (st.bestTime !== null ? `<br>Best: ${st.bestTime}s` : '');
});

engine.start();
