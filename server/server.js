/* BloxWorlds multiplayer server
 * Run it yourself:  cd server && npm install && npm start
 * Then paste ws://YOUR-IP:8081 into the BloxWorlds home page.
 * (GitHub Pages only hosts the static game files — it cannot run this server,
 *  so host it on your own PC, a VPS, Render, Railway, Glitch, etc.)
 */
'use strict';
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8081;
const wss = new WebSocketServer({ port: PORT, host: '0.0.0.0' });

let nextId = 1;
const players = new Map(); // ws -> {id, name, look, game, pos, lastMsg, msgCount}

const MAX_NAME = 20;
const MAX_CHAT = 140;
const MAX_MSGS_PER_SEC = 40;

function clean(s, max) {
  return String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').slice(0, max);
}

function send(ws, obj) {
  if (ws.readyState === 1) {
    try { ws.send(JSON.stringify(obj)); } catch (e) {}
  }
}

function broadcast(obj, exceptWs) {
  const raw = JSON.stringify(obj);
  for (const [ws] of players) {
    if (ws !== exceptWs && ws.readyState === 1) {
      try { ws.send(raw); } catch (e) {}
    }
  }
}

wss.on('connection', (ws) => {
  const p = {
    id: 'p' + (nextId++),
    name: 'Guest',
    look: null,
    joined: false,
    stage: 0,
    winAt: 0,
    rateWindow: Date.now(),
    rateCount: 0
  };
  players.set(ws, p);

  ws.on('message', (data) => {
    // rate limit
    const now = Date.now();
    if (now - p.rateWindow > 1000) { p.rateWindow = now; p.rateCount = 0; }
    if (++p.rateCount > MAX_MSGS_PER_SEC) return;
    if (data.length > 600) return;

    let m;
    try { m = JSON.parse(data); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;

    switch (m.t) {
      case 'join': {
        if (p.joined) return;
        p.joined = true;
        p.name = clean(m.name, MAX_NAME) || 'Guest';
        p.look = sanitizeLook(m.look);
        const roster = [];
        for (const [ows, op] of players) {
          if (ows !== ws && op.joined) roster.push({ id: op.id, name: op.name, look: op.look });
        }
        send(ws, { t: 'hello', id: p.id, players: roster });
        broadcast({ t: 'join', id: p.id, name: p.name, look: p.look }, ws);
        console.log(`[+] ${p.name} (${p.id}) joined — ${countJoined()} online`);
        break;
      }
      case 'state': {
        if (!p.joined || !Array.isArray(m.p) || m.p.length !== 4) return;
        const pos = m.p.map(Number);
        if (pos.some((v) => !isFinite(v) || Math.abs(v) > 5000)) return;
        broadcast({ t: 'state', id: p.id, p: pos, g: m.g ? 1 : 0, s: Math.min(Math.abs(Number(m.s) || 0), 50) }, ws);
        break;
      }
      case 'chat': {
        if (!p.joined) return;
        const text = clean(m.m, MAX_CHAT);
        if (!text) return;
        broadcast({ t: 'chat', id: p.id, m: text }, ws);
        break;
      }
      case 'stage': {
        if (!p.joined) return;
        const n = Number(m.n) | 0;
        if (n <= p.stage || n < 1 || n > 20) return;
        p.stage = n;
        broadcast({ t: 'stageAnn', name: p.name, n }, ws);
        break;
      }
      case 'win': {
        if (!p.joined || now - p.winAt < 10000) return;
        p.winAt = now;
        broadcast({ t: 'winAnn', name: p.name }, ws);
        break;
      }
    }
  });

  ws.on('close', () => {
    players.delete(ws);
    if (p.joined) {
      broadcast({ t: 'leave', id: p.id });
      console.log(`[-] ${p.name} (${p.id}) left — ${countJoined()} online`);
    }
  });
  ws.on('error', () => {});
});

function sanitizeLook(look) {
  if (!look || typeof look !== 'object') return null;
  const out = {};
  for (const k of ['body', 'pants', 'skin']) {
    const v = Number(look[k]);
    if (Number.isInteger(v) && v >= 0 && v <= 0xffffff) out[k] = v;
  }
  return out;
}

function countJoined() {
  let n = 0;
  for (const [, op] of players) if (op.joined) n++;
  return n;
}

console.log(`BloxWorlds server listening on ws://0.0.0.0:${PORT}`);
