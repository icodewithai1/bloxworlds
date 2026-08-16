// BloxWorlds Engine — Audio: real MP3 files (assets/audio/*.mp3)
const SFX = ['jump', 'land', 'death', 'checkpoint', 'win', 'portal', 'splash', 'chat'];

export class Audio {
  constructor() {
    this.ctx = null;
    this.buffers = new Map();
    this.music = null;
    this._pendingMusic = null;
    this._unlocked = false;

    const unlock = () => {
      if (this._unlocked) {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        if (this.music && this.music.paused) this.music.play().catch(() => {});
        return;
      }
      this._unlocked = true;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        this.ctx = new AC();
        this.gain = this.ctx.createGain();
        this.gain.gain.value = 0.9;
        this.gain.connect(this.ctx.destination);
        for (const name of SFX) {
          fetch('assets/audio/' + name + '.mp3')
            .then((r) => r.arrayBuffer())
            .then((ab) => this.ctx.decodeAudioData(ab))
            .then((buf) => this.buffers.set(name, buf))
            .catch(() => {});
        }
      }
      if (this._pendingMusic) {
        const m = this._pendingMusic;
        this._pendingMusic = null;
        this.playMusic(m);
      }
    };
    for (const e of ['pointerdown', 'keydown', 'touchstart']) {
      window.addEventListener(e, unlock, { passive: true });
    }
  }

  play(name) {
    if (!this.ctx) return;
    const buf = this.buffers.get(name);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.gain);
    src.start();
  }

  playMusic(name, volume = 0.5) {
    if (!this._unlocked) { this._pendingMusic = name; return; }
    this.stopMusic();
    const a = new window.Audio('assets/audio/' + name + '.mp3');
    a.loop = true;
    a.volume = volume;
    a.play().catch(() => {});
    this.music = a;
  }

  stopMusic() {
    if (this.music) {
      this.music.pause();
      this.music.src = '';
      this.music = null;
    }
    this._pendingMusic = null;
  }
}
