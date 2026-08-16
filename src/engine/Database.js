// BloxWorlds Engine — Database: persistent local player data (localStorage)
// Stores profile, avatar look, and per-game stats like best times & wins.
const KEY = 'bloxworlds_db_v1';

const SHIRT_COLORS = [0x1f7fd1, 0xd32f2f, 0x00a06a, 0xf9a825, 0x8e24aa, 0xe8e8e8];
const JACKET_COLORS = [0x17181a, 0x2c3540, 0x4e342e, 0x263a26, 0x3c1f42];
const PANT_COLORS = [0x2a332a, 0x27303d, 0x3a2c22, 0x21252a, 0x402433];
const HAIR_COLORS = [0x7a4a21, 0x2c221b, 0xc9a04a, 0x8d3b1f, 0x3a3a3c];
const HAIR_STYLES = ['bacon', 'swoosh', 'spiky', 'bob', 'cap'];

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
    if (!this.data.profile.look || this.data.profile.look.shirt === undefined) {
      this.data.profile.look = {
        shirt: pick(SHIRT_COLORS), jacket: pick(JACKET_COLORS),
        pants: pick(PANT_COLORS), hair: pick(HAIR_COLORS),
        style: pick(HAIR_STYLES), skin: 0xf3f3f3,
        clothes: (Math.random() * 4) | 0
      };
    }
    if (!this.data.profile.look.style) this.data.profile.look.style = pick(HAIR_STYLES);
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
    this.setLook({
      shirt: pick(SHIRT_COLORS), jacket: pick(JACKET_COLORS),
      pants: pick(PANT_COLORS), hair: pick(HAIR_COLORS),
      style: pick(HAIR_STYLES), skin: 0xf3f3f3,
      clothes: (Math.random() * 4) | 0
    });
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
