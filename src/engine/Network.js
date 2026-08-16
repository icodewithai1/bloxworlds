// BloxWorlds Engine — Network: serverless P2P multiplayer via Trystero (WebRTC)
// Peers find each other through public nostr relays — no game server needed,
// works straight from GitHub Pages.
import { joinRoom, selfId } from 'trystero/nostr';

const APP_ID = 'bloxworlds-v1';

// Compatibility: trystero <=0.21 makeAction returns [send, get];
// trystero >=0.25 returns {send, onMessage(data, {peerId})}.
function wrapAction(room, name) {
  const a = room.makeAction(name);
  if (Array.isArray(a)) {
    return { send: a[0], onMessage: (fn) => a[1]((data, peerId) => fn(data, peerId)) };
  }
  return {
    send: (data, target) => a.send(data, target ? { target } : undefined),
    onMessage: (fn) => { a.onMessage = (data, ctx) => fn(data, ctx && ctx.peerId); }
  };
}

function onPeerEvent(room, prop, fn) {
  if (typeof room[prop] === 'function') room[prop](fn); // old API
  else room[prop] = fn;                                 // new API (property)
}

export class Network {
  // roomId: e.g. 'obby:ABC123' — a specific server instance of a game
  constructor(gameId) {
    this.selfId = selfId;
    this.peers = new Map(); // peerId -> profile {name, look}
    this.onPeerJoin = null;
    this.onPeerLeave = null;
    this.onState = null;
    this.onChat = null;
    this.onEvent = null;
    this.dead = false;

    try {
      this.room = joinRoom({ appId: APP_ID }, gameId);
    } catch (e) {
      console.warn('[BloxWorlds] P2P unavailable:', e);
      this.dead = true;
      return;
    }

    const profile = wrapAction(this.room, 'profile');
    const state = wrapAction(this.room, 'state');
    const chat = wrapAction(this.room, 'chat');
    const event = wrapAction(this.room, 'event');
    this._profileA = profile;
    this._stateA = state;
    this._chatA = chat;
    this._eventA = event;

    onPeerEvent(this.room, 'onPeerJoin', (peerId) => {
      // introduce ourselves to the newcomer
      if (this._profile) {
        try { profile.send(this._profile, peerId); } catch (e) {}
      }
    });

    onPeerEvent(this.room, 'onPeerLeave', (peerId) => {
      const p = this.peers.get(peerId);
      this.peers.delete(peerId);
      if (p) this.onPeerLeave && this.onPeerLeave(peerId, p);
    });

    profile.onMessage((data, peerId) => {
      if (!data || typeof data !== 'object' || !peerId) return;
      const known = this.peers.has(peerId);
      this.peers.set(peerId, {
        name: sanitizeName(data.name),
        look: sanitizeLook(data.look)
      });
      if (!known) this.onPeerJoin && this.onPeerJoin(peerId, this.peers.get(peerId));
    });

    state.onMessage((s, peerId) => {
      if (!this.peers.has(peerId)) return;
      if (!s || !Array.isArray(s.p) || s.p.length !== 4) return;
      const p = s.p.map(Number);
      if (p.some((v) => !isFinite(v) || Math.abs(v) > 5000)) return;
      this.onState && this.onState(peerId, p, !!s.g, Math.min(Math.abs(Number(s.s) || 0), 50));
    });

    chat.onMessage((m, peerId) => {
      if (!this.peers.has(peerId)) return;
      const text = sanitizeChat(m);
      if (text) this.onChat && this.onChat(peerId, text);
    });

    event.onMessage((e, peerId) => {
      if (!this.peers.has(peerId) || !e || typeof e.k !== 'string') return;
      this.onEvent && this.onEvent(peerId, e.k, e);
    });
  }

  join(name, look) {
    this._profile = { name: sanitizeName(name), look };
    if (this.dead) return;
    try { this._profileA.send(this._profile); } catch (e) {}
  }

  sendState(pos, yaw, grounded, speed) {
    if (this.dead || this.peers.size === 0) return;
    try {
      this._stateA.send({
        p: [+pos.x.toFixed(2), +pos.y.toFixed(2), +pos.z.toFixed(2), +yaw.toFixed(2)],
        g: grounded ? 1 : 0,
        s: +speed.toFixed(1)
      });
    } catch (e) {}
  }

  sendChat(text) {
    if (this.dead) return;
    try { this._chatA.send(sanitizeChat(text)); } catch (e) {}
  }

  sendEvent(kind, data = {}) {
    if (this.dead) return;
    try { this._eventA.send({ k: kind, ...data }); } catch (e) {}
  }

  get peerCount() { return this.peers.size; }
}

function sanitizeName(s) {
  return String(s || 'Guest').replace(/[\u0000-\u001f<>]/g, '').slice(0, 20) || 'Guest';
}
function sanitizeChat(s) {
  return String(s || '').replace(/[\u0000-\u001f]/g, '').slice(0, 140);
}
const OK_STYLES = ['bacon', 'swoosh', 'spiky', 'bob', 'cap', 'none'];
function sanitizeLook(look) {
  if (!look || typeof look !== 'object') return {};
  const out = {};
  for (const k of ['shirt', 'jacket', 'pants', 'hair', 'skin', 'body']) {
    const v = Number(look[k]);
    if (Number.isInteger(v) && v >= 0 && v <= 0xffffff) out[k] = v;
  }
  if (OK_STYLES.includes(look.style)) out.style = look.style;
  const cl = Number(look.clothes);
  if (Number.isInteger(cl) && cl >= 0 && cl <= 8) out.clothes = cl;
  return out;
}
