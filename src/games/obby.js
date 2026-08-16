// BloxWorlds — Mega Obby (built on the BloxWorlds engine + Trystero P2P)
import { Vector3, MeshBuilder, StandardMaterial, Color3 } from '../engine/blox3d.js';
import {
  Engine, World, Player, RemotePlayer, Input, Network, Database, escapeHtml,
  ServerDirectory, makeServerCode, Audio, setupGameMenu, injectGameChrome,
  showLoading, setupPlayerList, Effects, AntiCheat
} from '../engine/index.js';

injectGameChrome();
const doneLoading = showLoading('Mega Obby');

const GAME_ID = 'obby';

// ---- server instance: ?server=CODE joins that server, otherwise host a new one
const urlq = new URLSearchParams(location.search);
let SERVER_CODE = (urlq.get('server') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
const IS_HOST = !SERVER_CODE;
if (IS_HOST) SERVER_CODE = makeServerCode();
const ROOM_ID = GAME_ID + ':' + SERVER_CODE;
const RAINBOW = [0xe2231a, 0xff8f00, 0xfdd835, 0x43a047, 0x1e88e5, 0x8e24aa];

// ------------------------------------------------------------------ setup
const db = new Database();
const engine = new Engine(document.getElementById('c'));
engine.setSky('day');
engine.addClouds();
const world = new World(engine);
const input = new Input(engine.canvas);
const audio = new Audio();
audio.playMusic('chill');
const fx = new Effects(engine);
const ac = new AntiCheat();

// ------------------------------------------------------------------ map
function buildMap() {
  const P = (o) => world.addPart(o);

  // spawn island
  P({ x: 0, y: 0.5, z: 0, w: 22, h: 1, d: 22, color: 0x43a047, tex: 'grass' });
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
  const trophy = MeshBuilder.CreateCylinder('trophy', { diameterTop: 1.2, diameterBottom: 2.2, height: 2.4, tessellation: 16 }, engine.scene);
  const tm = new StandardMaterial('trophym', engine.scene);
  tm.diffuseColor = new Color3(1, 0.84, 0);
  tm.emissiveColor = new Color3(0.35, 0.28, 0);
  tm.specularColor = new Color3(0.8, 0.8, 0.5);
  trophy.material = tm;
  world.addModel(trophy, new Vector3(0, yy + 2.3, z - 4));
}
buildMap();

// checkpoint light beams + spawn ring + win beam
for (const cp of world.checkpoints) {
  fx.beam(cp.mesh.position.x, cp.mesh.position.y, cp.mesh.position.z, 0xffee58, 8, 0.5);
}
fx.spawnRing(0, 1, 0, 0x69f0ae, 2.4);
{
  const winPart = world.parts.find((p) => p.kind === 'win');
  if (winPart) fx.beam(winPart.mesh.position.x, winPart.mesh.position.y + 0.5, winPart.mesh.position.z, 0xffd700, 14, 1.1);
}

// ------------------------------------------------------------------ player
const player = new Player(engine, world, { name: db.name, look: db.look });
db.recordPlay(GAME_ID);
const runStart = performance.now();

setupGameMenu({ gameName: 'Mega Obby', onRespawn: () => player.respawn(false) });
const plist = setupPlayerList();
ac.install(player);

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
let net;
try {
  net = new Network(ROOM_ID);
} catch (e) {
  console.warn('[BloxWorlds] multiplayer disabled:', e);
  net = { dead: true, peerCount: 0, join() {}, sendState() {}, sendChat() {}, sendEvent() {} };
}
const remotes = new Map();

// advertise this server in the global lobby directory so it shows on every hub
let directory = null;
try {
  directory = new ServerDirectory();
  directory.advertise(() => ({
    code: SERVER_CODE,
    game: GAME_ID,
    name: 'Mega Obby — ' + SERVER_CODE,
    host: db.name,
    players: remotes.size + 1
  }));
} catch (e) { console.warn('[BloxWorlds] lobby advertise failed:', e); }

function setConn() {
  if (net.dead) {
    connEl.className = 'off';
    connEl.textContent = '● Solo mode';
    return;
  }
  const n = net.peerCount;
  connEl.className = n > 0 ? 'on' : 'off';
  connEl.textContent = (n > 0 ? `● ${n + 1} players` : '● Waiting for players') + ` — Server ${SERVER_CODE}`;
}
setConn();
chatLine('SYSTEM', (IS_HOST ? 'You created server ' : 'Joined server ') + SERVER_CODE + ' — it is now listed on the BloxWorlds home page.', true);

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
  if (!ac.validateState(id, p)) return;
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
    if (r) fx.confetti(r.avatar.group.position.clone().add(new Vector3(0, 2, 0)));
  } else if (kind === 'died') {
    if (r) fx.burst(r.avatar.group.position.clone().add(new Vector3(0, 1.5, 0)), 0xd32f2f, 14);
  }
};
net.join(db.name, db.look);

// ------------------------------------------------------------------ player events
player.onDeath = () => {
  flash('You died!', '#ff5252');
  audio.play('death');
  fx.burst(player.pos.clone().add(new Vector3(0, 1.5, 0)), 0xd32f2f, 16);
  db.recordDeath(GAME_ID);
  net.sendEvent('died');
};
player.onCheckpoint = (n) => {
  flash(`Checkpoint ${n}!`, '#69f0ae');
  audio.play('checkpoint');
  fx.burst(player.pos.clone().add(new Vector3(0, 1, 0)), 0xffee58, 12, 6);
  db.recordStage(GAME_ID, n);
  net.sendEvent('stage', { n });
};
player.onWin = () => {
  const t = Math.round((performance.now() - runStart) / 100) / 10;
  const s = db.recordWin(GAME_ID, t);
  flash('🏆 YOU WIN! 🏆', '#ffd700');
  audio.play('win');
  fx.confetti(player.pos.clone().add(new Vector3(0, 2, 0)));
  chatLine('SYSTEM', `You finished in ${t}s (best: ${s.bestTime}s, wins: ${s.wins})`, true);
  net.sendEvent('win');
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
    `Deaths: ${player.deaths}` +
    (st.bestTime !== null ? `<br>Best: ${st.bestTime}s` : '');

  plist.update([
    { name: db.name, stat: 'Stage ' + player.stage, me: true },
    ...[...remotes.values()].map((r) => ({ name: r.name, stat: 'Stage ' + (r.stage || 0) }))
  ]);
});

engine.start();
doneLoading();
