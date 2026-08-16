// BloxWorlds — Speedrunners (inspired by Speed Run 4)
// Long straight levels you blast through at crazy speed. Finish the portal
// at the end of each level to warp to the next. 4 levels, escalating speed.
import { Vector3, MeshBuilder, StandardMaterial, Color3, Mesh } from 'babylon';
import {
  Engine, World, Player, RemotePlayer, Input, Network, Database, escapeHtml,
  ServerDirectory, makeServerCode, Audio, setupGameMenu, injectGameChrome,
  showLoading, setupPlayerList, Effects
} from '../engine/index.js';

injectGameChrome();
const doneLoading = showLoading('Speedrunners');

const GAME_ID = 'speedrun';

const urlq = new URLSearchParams(location.search);
let SERVER_CODE = (urlq.get('server') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
const IS_HOST = !SERVER_CODE;
if (IS_HOST) SERVER_CODE = makeServerCode();
const ROOM_ID = GAME_ID + ':' + SERVER_CODE;

// ------------------------------------------------------------------ setup
const db = new Database();
const engine = new Engine(document.getElementById('c'));
engine.setSky('sunset');
engine.addClouds(16);
const world = new World(engine);
const input = new Input(engine.canvas);
const audio = new Audio();
audio.playMusic('drive');
const fx = new Effects(engine);

// ------------------------------------------------------------------ levels
// Each level: a fast linear course along -Z with hazards; ends with a portal.
const LEVEL_THEMES = [
  { name: 'Neon Dash', main: 0x27a4f2, alt: 0x9c27b0, floor: 0x1c2b4a },
  { name: 'Lava Sprint', main: 0xff7043, alt: 0xffd54f, floor: 0x3a1f1a },
  { name: 'Frost Run', main: 0x80deea, alt: 0xe1f5fe, floor: 0x1a2f3a },
  { name: 'Void Rush', main: 0xba68c8, alt: 0x7c4dff, floor: 0x241a3a }
];
const LEVELS = LEVEL_THEMES.length;
let portals = [];

function buildLevel(idx) {
  // wipe old parts
  for (const p of world.parts) p.mesh.dispose();
  world.parts.length = 0;
  world.checkpoints.length = 0;
  for (const pr of portals) { pr.g.dispose(); pr.disc && pr.disc.dispose(); }
  portals = [];

  const th = LEVEL_THEMES[idx];
  const P = (o) => world.addPart(o);
  let z = 0;

  // start pad
  P({ x: 0, y: 0, z: 4, w: 16, h: 1, d: 20, color: th.floor, tex: 'stud' });
  world.spawn.set(0, 2, 6);

  const segs = 26 + idx * 6;
  let y = 0;
  for (let i = 0; i < segs; i++) {
    const r = Math.random();
    const c = i % 2 ? th.main : th.alt;
    if (r < 0.42) {
      // straight runway
      const w = 7 - Math.min(idx, 2);
      P({ x: 0, y, z: z - 10, w, h: 1, d: 14, color: c, tex: 'noise' });
      z -= 14;
    } else if (r < 0.62) {
      // gap jump
      const gap = 6 + idx * 1.5 + Math.random() * 3;
      z -= gap;
      P({ x: 0, y, z: z - 6, w: 6, h: 1, d: 10, color: c, tex: 'noise' });
      z -= 10;
    } else if (r < 0.78) {
      // side shift
      const off = (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 2);
      P({ x: off, y, z: z - 8, w: 5, h: 1, d: 10, color: c, tex: 'noise' });
      P({ x: 0, y, z: z - 18, w: 6, h: 1, d: 8, color: i % 2 ? th.alt : th.main, tex: 'noise' });
      z -= 24;
    } else if (r < 0.9) {
      // kill strip across the floor — hop it
      P({ x: 0, y, z: z - 6, w: 8, h: 1, d: 8, color: c, tex: 'noise' });
      P({ x: 0, y: y + 0.1, z: z - 12.5, w: 8, h: 1.2, d: 3, color: 0xd32f2f, kind: 'kill' });
      P({ x: 0, y, z: z - 19, w: 8, h: 1, d: 8, color: i % 2 ? th.alt : th.main, tex: 'noise' });
      z -= 25;
    } else {
      // stair drop
      P({ x: 0, y: y - 1, z: z - 7, w: 7, h: 1, d: 8, color: c, tex: 'noise' });
      y -= 1;
      z -= 10;
    }
  }

  // finish platform + PORTAL
  P({ x: 0, y, z: z - 10, w: 14, h: 1, d: 16, color: th.floor, tex: 'stud' });
  makePortal(0, y + 3.2, z - 14, th.main, idx);
  z -= 20;

  // glowing rails along the course for the speed feel
  const railM = new StandardMaterial('railm' + idx, engine.scene);
  railM.emissiveColor = new Color3(((th.main >> 16) & 255) / 255, ((th.main >> 8) & 255) / 255, (th.main & 255) / 255);
  railM.disableLighting = true;
  for (let rz = 0; rz > z; rz -= 30) {
    for (const sx of [-11, 11]) {
      const rail = MeshBuilder.CreateBox('rail', { width: 0.4, height: 0.4, depth: 22 }, engine.scene);
      rail.material = railM;
      rail.position.set(sx, y + 2 + Math.random() * 6, rz - 10);
      world.parts.push({ mesh: rail, kind: 'deco', half: new Vector3(0, 0, 0), base: rail.position.clone(), delta: 0 });
    }
  }
}

function makePortal(x, y, z, color, idx) {
  const scene = engine.scene;
  const cc = new Color3(((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255);
  const ring = MeshBuilder.CreateTorus('portal', { diameter: 4.8, thickness: 0.7, tessellation: 32 }, scene);
  const rm = new StandardMaterial('portalm' + idx, scene);
  rm.emissiveColor = cc;
  rm.diffuseColor = cc.scale(0.4);
  ring.material = rm;
  ring.rotation.x = Math.PI / 2; // torus stands upright facing the runway
  const disc = MeshBuilder.CreateDisc('portald', { radius: 2.1, tessellation: 24 }, scene);
  const dm = new StandardMaterial('portaldm' + idx, scene);
  dm.emissiveColor = new Color3(1, 1, 1);
  dm.alpha = 0.35;
  dm.disableLighting = true;
  dm.backFaceCulling = false;
  disc.material = dm;
  ring.position.set(x, y, z);
  disc.position.set(x, y, z);
  portals.push({ g: ring, disc, x, y, z, idx });
}

// ------------------------------------------------------------------ player (FAST)
const BASE_SPEED = 16, LEVEL_SPEED_BONUS = 2.5;
let level = 0;
const player = new Player(engine, world, {
  name: db.name, look: db.look,
  speed: BASE_SPEED, jumpPower: 15
});
buildLevel(0);
player.checkpoint.copyFrom(world.spawn);
player.respawn(false);
db.recordPlay(GAME_ID);
const runStart = performance.now();
let levelStart = performance.now();

setupGameMenu({ gameName: 'Speedrunners', onRespawn: () => player.respawn(false) });
const plist = setupPlayerList();

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
  msgTimer = setTimeout(() => { msgEl.style.opacity = 0; }, 1800);
}

function chatLine(name, text, sys) {
  const d = document.createElement('div');
  d.innerHTML = `<span class="n${sys ? ' sys' : ''}">${escapeHtml(name)}:</span> ${escapeHtml(text)}`;
  chatlog.appendChild(d);
  while (chatlog.children.length > 40) chatlog.removeChild(chatlog.firstChild);
  chatlog.scrollTop = chatlog.scrollHeight;
}

// ------------------------------------------------------------------ network
let net;
try {
  net = new Network(ROOM_ID);
} catch (e) {
  net = { dead: true, peerCount: 0, join() {}, sendState() {}, sendChat() {}, sendEvent() {} };
}
const remotes = new Map();

let directory = null;
try {
  directory = new ServerDirectory();
  directory.advertise(() => ({
    code: SERVER_CODE, game: GAME_ID,
    name: 'Speedrunners — ' + SERVER_CODE,
    host: db.name, players: remotes.size + 1
  }));
} catch (e) {}

function setConn() {
  if (net.dead) { connEl.className = 'off'; connEl.textContent = '● Solo mode'; return; }
  const n = net.peerCount;
  connEl.className = n > 0 ? 'on' : 'off';
  connEl.textContent = (n > 0 ? `● ${n + 1} players` : '● Waiting for players') + ` — Server ${SERVER_CODE}`;
}
setConn();
chatLine('SYSTEM', (IS_HOST ? 'You created server ' : 'Joined server ') + SERVER_CODE, true);
chatLine('SYSTEM', 'Level 1: ' + LEVEL_THEMES[0].name + ' — RUN!', true);

net.onPeerJoin = (id, profile) => {
  remotes.set(id, new RemotePlayer(engine, profile));
  chatLine('SYSTEM', `${profile.name} joined`, true);
  setConn();
};
net.onPeerLeave = (id, profile) => {
  const r = remotes.get(id);
  if (r) { r.dispose(); remotes.delete(id); }
  if (profile) chatLine('SYSTEM', `${profile.name} left`, true);
  setConn();
};
net.onState = (id, p, g, s) => { const r = remotes.get(id); if (r) r.applyState(p, g, s); };
net.onChat = (id, text) => { const r = remotes.get(id); chatLine(r ? r.name : 'Guest', text); audio.play('chat'); };
net.onEvent = (id, kind, e) => {
  const r = remotes.get(id);
  const name = r ? r.name : 'Guest';
  if (kind === 'level') {
    const n = Number(e.n) | 0;
    if (n >= 1 && n <= LEVELS) chatLine('SYSTEM', `⚡ ${name} reached level ${n + 1}!`, true);
  } else if (kind === 'win') chatLine('SYSTEM', `🏆 ${name} beat all ${LEVELS} levels!`, true);
};
net.join(db.name, db.look);

// ------------------------------------------------------------------ level progression
function nextLevel() {
  audio.play('portal');
  fx.confetti(player.pos.clone().add(new Vector3(0, 2, 0)));
  const t = Math.round((performance.now() - levelStart) / 100) / 10;
  level++;
  if (level >= LEVELS) {
    // finished the whole game
    player.won = true;
    const total = Math.round((performance.now() - runStart) / 100) / 10;
    const s = db.recordWin(GAME_ID, total);
    flash('🏆 ALL LEVELS COMPLETE! 🏆', '#ffd700');
    audio.play('win');
    chatLine('SYSTEM', `Finished in ${total}s (best: ${s.bestTime}s)`, true);
    net.sendEvent('win');
    level = LEVELS - 1;
    return;
  }
  flash('LEVEL ' + (level + 1) + ' — ' + LEVEL_THEMES[level].name, '#7ce7ff');
  chatLine('SYSTEM', `Level ${level} done in ${t}s! Now: ${LEVEL_THEMES[level].name}`, true);
  db.recordStage(GAME_ID, level);
  net.sendEvent('level', { n: level });
  buildLevel(level);
  player.moveSpeed = BASE_SPEED + level * LEVEL_SPEED_BONUS;
  player.checkpoint.copyFrom(world.spawn);
  player.respawn(false);
  levelStart = performance.now();
}

player.onDeath = () => {
  flash('Wasted!', '#ff5252');
  audio.play('death');
  fx.burst(player.pos.clone().add(new Vector3(0, 1.5, 0)), 0xff5252, 16);
  db.recordDeath(GAME_ID);
};
player.onJump = () => audio.play('jump');
player.onLand = () => audio.play('land');

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
    if (v) { chatLine(db.name, v); net.sendChat(v); }
    closeChat();
  } else if (e.code === 'Escape') closeChat();
});

// ------------------------------------------------------------------ loop
let lastNet = 0;
engine.addSystem((dt, now) => {
  player.update(dt, input);
  for (const r of remotes.values()) r.update(dt);
  player.updateCamera(input);

  // portal spin + hit check
  for (const pr of portals) {
    pr.g.rotation.y += dt * 1.5;
    const dx = player.pos.x - pr.x, dy = (player.pos.y + 1.3) - pr.y, dz = player.pos.z - pr.z;
    if (dx * dx + dy * dy + dz * dz < 7) { nextLevel(); break; }
  }

  // speed FOV kick
  const sp = player.speed;
  engine.camera.fov = 1.22 + Math.min(sp * 0.0095, 0.28); // radians in Babylon

  if (now - lastNet > 66) {
    lastNet = now;
    net.sendState(player.pos, player.yaw, player.grounded, sp);
  }

  const lt = Math.round((now - levelStart) / 100) / 10;
  hud.innerHTML =
    `<b>${escapeHtml(db.name)}</b><br>` +
    `Level: ${level + 1} / ${LEVELS} — ${LEVEL_THEMES[level].name}<br>` +
    `Time: ${lt}s · Deaths: ${player.deaths}<br>` +
    `Speed: ${sp.toFixed(0)}`;

  plist.update([
    { name: db.name, stat: 'Lvl ' + (level + 1), me: true },
    ...[...remotes.values()].map((r) => ({ name: r.name, stat: '' }))
  ]);
});

engine.start();
doneLoading();
