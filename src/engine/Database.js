// BloxWorlds Engine — Database: persistent local player data (localStorage)
// Stores profile, avatar look, and per-game stats like best times & wins.
const KEY = 'bloxworlds_db_v1';

const BODY_COLORS = [0x0b5bd3, 0xd32f2f, 0x00897b, 0xf9a825, 0x6a1b9a, 0x37474f];
const PANT_COLORS = [0x2e7d32, 0x283593, 0x4e342e, 0x37474f, 0xad1457];

function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

export class Database {
  constructor() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    this.data = raw && typeof raw === 'object' ? raw : {};
    this.data.profile = this.data.profile || {};
    this.data.stats = this.data.stats || {};

    if (!this.data.profile.name) {
      // migrate old key if present
      const old = (localStorage.getItem('bw_name') || '').trim();
      this.data.profile.name = old || 'Guest' + ((Math.random() * 9000 + 1000) | 0);
    }
    if (!this.data.profile.look) {
      this.data.profile.look = { body: pick(BODY_COLORS), pants: pick(PANT_COLORS), skin: 0xf5c542 };
    }
    this.save();
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {}
  }

  get name() { return this.data.profile.name; }
  set name(v) { this.data.profile.name = String(v).slice(0, 20); this.save(); }

  get look() { return this.data.profile.look; }
  setLook(look) { this.data.profile.look = look; this.save(); }
  randomizeLook() {
    this.setLook({ body: pick(BODY_COLORS), pants: pick(PANT_COLORS), skin: 0xf5c542 });
    return this.look;
  }

  stats(game) {
    if (!this.data.stats[game]) {
      this.data.stats[game] = { plays: 0, wins: 0, deaths: 0, bestTime: null, bestStage: 0 };
    }
    return this.data.stats[game];
  }

  recordPlay(game) { this.stats(game).plays++; this.save(); }
  recordDeath(game) { this.stats(game).deaths++; this.save(); }
  recordStage(game, n) {
    const s = this.stats(game);
    if (n > s.bestStage) { s.bestStage = n; this.save(); }
  }
  recordWin(game, timeSec) {
    const s = this.stats(game);
    s.wins++;
    if (s.bestTime === null || timeSec < s.bestTime) s.bestTime = timeSec;
    this.save();
    return s;
  }
}
