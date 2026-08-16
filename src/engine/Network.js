// BloxWorlds Engine — Network: serverless P2P multiplayer via Trystero (WebRTC)
// Peers find each other through public nostr relays — no game server needed,
// works straight from GitHub Pages.
import { joinRoom, selfId } from 'trystero/nostr';

const APP_ID = 'bloxworlds-v1';

export class Network {
  constructor(gameId) {
    this.selfId = selfId;
    this.peers = new Map(); // peerId -> profile {name, look}
    this.onPeerJoin = null;
    this.onPeerLeave = null;
    this.onState = null;
    this.onChat = null;
    this.onEvent = null;
    this.connected = false;

    this.room = joinRoom({ appId: APP_ID }, gameId);

    const [sendProfile, getProfile] = this.room.makeAction('profile');
    const [sendState, getState] = this.room.makeAction('state');
    const [sendChat, getChat] = this.room.makeAction('chat');
    const [sendEvent, getEvent] = this.room.makeAction('event');
    this._sendProfile = sendProfile;
    this._sendState = sendState;
    this._sendChat = sendChat;
    this._sendEvent = sendEvent;

    this.room.onPeerJoin((peerId) => {
      this.connected = true;
      // introduce ourselves to the newcomer
      if (this._profile) sendProfile(this._profile, peerId);
    });

    this.room.onPeerLeave((peerId) => {
      const p = this.peers.get(peerId);
      this.peers.delete(peerId);
      this.onPeerLeave && this.onPeerLeave(peerId, p);
    });

    getProfile((profile, peerId) => {
      if (!profile || typeof profile !== 'object') return;
      const known = this.peers.has(peerId);
      this.peers.set(peerId, {
        name: sanitizeName(profile.name),
        look: sanitizeLook(profile.look)
      });
      if (!known) this.onPeerJoin && this.onPeerJoin(peerId, this.peers.get(peerId));
    });

    getState((s, peerId) => {
      if (!this.peers.has(peerId)) return;
      if (!s || !Array.isArray(s.p) || s.p.length !== 4) return;
      const p = s.p.map(Number);
      if (p.some((v) => !isFinite(v) || Math.abs(v) > 5000)) return;
      this.onState && this.onState(peerId, p, !!s.g, Math.min(Math.abs(Number(s.s) || 0), 50));
    });

    getChat((m, peerId) => {
      if (!this.peers.has(peerId)) return;
      const text = sanitizeChat(m);
      if (text) this.onChat && this.onChat(peerId, text);
    });

    getEvent((e, peerId) => {
      if (!this.peers.has(peerId) || !e || typeof e.k !== 'string') return;
      this.onEvent && this.onEvent(peerId, e.k, e);
    });
  }

  join(name, look) {
    this._profile = { name: sanitizeName(name), look };
    this._sendProfile(this._profile);
  }

  sendState(pos, yaw, grounded, speed) {
    try {
      this._sendState({
        p: [+pos.x.toFixed(2), +pos.y.toFixed(2), +pos.z.toFixed(2), +yaw.toFixed(2)],
        g: grounded ? 1 : 0,
        s: +speed.toFixed(1)
      });
    } catch (e) {}
  }

  sendChat(text) {
    try { this._sendChat(sanitizeChat(text)); } catch (e) {}
  }

  sendEvent(kind, data = {}) {
    try { this._sendEvent({ k: kind, ...data }); } catch (e) {}
  }

  get peerCount() { return this.peers.size; }
}

function sanitizeName(s) {
  return String(s || 'Guest').replace(/[\u0000-\u001f<>]/g, '').slice(0, 20) || 'Guest';
}
function sanitizeChat(s) {
  return String(s || '').replace(/[\u0000-\u001f]/g, '').slice(0, 140);
}
function sanitizeLook(look) {
  if (!look || typeof look !== 'object') return {};
  const out = {};
  for (const k of ['body', 'pants', 'skin']) {
    const v = Number(look[k]);
    if (Number.isInteger(v) && v >= 0 && v <= 0xffffff) out[k] = v;
  }
  return out;
}
