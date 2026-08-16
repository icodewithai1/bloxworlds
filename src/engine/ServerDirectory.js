// BloxWorlds Engine — ServerDirectory: shared, serverless "database" of live game servers.
// Everyone connected to BloxWorlds joins one global P2P lobby room. Players inside a
// game announce their server (code, game, name, player count) every few seconds;
// hub pages listen and build a live server list that anyone can join.
// No central database needed — the directory IS the swarm.
import { joinRoom, selfId } from 'trystero/nostr';

const APP_ID = 'bloxworlds-v1';
const LOBBY = '__lobby__';
const TTL = 12000;          // server entry expires if not re-announced
const ANNOUNCE_MS = 4000;

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

const sanit = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').slice(0, n);

export class ServerDirectory {
  constructor() {
    this.servers = new Map(); // code -> {code, game, name, host, players, seenAt, peers:Set}
    this.onUpdate = null;
    this.dead = false;
    this._announce = null;
    this._timers = [];

    try {
      this.room = joinRoom({ appId: APP_ID }, LOBBY);
    } catch (e) {
      console.warn('[BloxWorlds] lobby unavailable:', e);
      this.dead = true;
      return;
    }

    const ann = wrapAction(this.room, 'announce');
    this._annA = ann;

    ann.onMessage((s, peerId) => {
      if (!s || typeof s !== 'object' || !peerId) return;
      const code = sanit(s.code, 12);
      const game = sanit(s.game, 20);
      if (!code || !game) return;
      const prev = this.servers.get(code);
      const peers = prev ? prev.peers : new Set();
      peers.add(peerId);
      this.servers.set(code, {
        code, game,
        name: sanit(s.name, 40) || 'Server ' + code,
        host: sanit(s.host, 20) || 'Guest',
        players: Math.min(Math.max(peers.size, Number(s.players) | 0), 99),
        seenAt: Date.now(),
        peers
      });
      this._emit();
    });

    // when a peer selling a server leaves, drop them from counts
    const onLeave = (peerId) => {
      for (const s of this.servers.values()) s.peers.delete(peerId);
      this._emit();
    };
    if (typeof this.room.onPeerLeave === 'function') this.room.onPeerLeave(onLeave);
    else this.room.onPeerLeave = onLeave;

    // expiry sweep
    this._timers.push(setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [code, s] of this.servers) {
        if (now - s.seenAt > TTL) { this.servers.delete(code); changed = true; }
      }
      if (changed) this._emit();
    }, 3000));
  }

  _emit() {
    this.onUpdate && this.onUpdate(this.list());
  }

  list() {
    return [...this.servers.values()]
      .sort((a, b) => b.players - a.players || a.code.localeCompare(b.code));
  }

  // Call from inside a game: keep telling the lobby this server exists.
  advertise(getInfo) {
    if (this.dead) return;
    const tick = () => {
      const info = getInfo();
      if (!info) return;
      try { this._annA.send(info); } catch (e) {}
    };
    tick();
    this._timers.push(setInterval(tick, ANNOUNCE_MS));
  }

  destroy() {
    for (const t of this._timers) clearInterval(t);
    try { this.room && this.room.leave && this.room.leave(); } catch (e) {}
  }
}

export function makeServerCode() {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += abc[(Math.random() * abc.length) | 0];
  return c;
}

export { selfId };
