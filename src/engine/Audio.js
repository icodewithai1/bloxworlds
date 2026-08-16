// BloxWorlds Engine — Audio: WebAudio SFX + procedural background music.
// Everything is synthesized — no audio files needed, loads instantly.
export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this._musicTimer = null;
    this._pendingMusic = null;
    const unlock = () => {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.45;
        this.master.connect(this.ctx.destination);
        if (this._pendingMusic) { const m = this._pendingMusic; this._pendingMusic = null; this.playMusic(m); }
      } else if (this.ctx.state === 'suspended') this.ctx.resume();
    };
    for (const e of ['pointerdown', 'keydown', 'touchstart']) {
      window.addEventListener(e, unlock, { passive: true });
    }
  }

  _tone({ f0 = 440, f1 = null, dur = 0.15, type = 'square', vol = 0.25, delay = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _noise({ dur = 0.2, vol = 0.2, f = 800, delay = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const n = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'lowpass'; flt.frequency.value = f;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(flt); flt.connect(g); g.connect(this.master);
    src.start(t);
  }

  play(name) {
    switch (name) {
      case 'jump': this._tone({ f0: 260, f1: 520, dur: 0.14, type: 'square', vol: 0.16 }); break;
      case 'land': this._noise({ dur: 0.08, vol: 0.12, f: 500 }); break;
      case 'death':
        this._tone({ f0: 300, f1: 60, dur: 0.4, type: 'sawtooth', vol: 0.2 });
        this._noise({ dur: 0.3, vol: 0.15, f: 900 });
        break;
      case 'checkpoint':
        this._tone({ f0: 660, dur: 0.1, type: 'square', vol: 0.15 });
        this._tone({ f0: 880, dur: 0.16, type: 'square', vol: 0.15, delay: 0.09 });
        break;
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) => this._tone({ f0: f, dur: 0.22, type: 'square', vol: 0.16, delay: i * 0.13 }));
        break;
      case 'portal':
        this._tone({ f0: 400, f1: 1200, dur: 0.3, type: 'sine', vol: 0.2 });
        this._tone({ f0: 500, f1: 1500, dur: 0.3, type: 'sine', vol: 0.12, delay: 0.05 });
        break;
      case 'chat': this._tone({ f0: 900, dur: 0.05, type: 'sine', vol: 0.08 }); break;
    }
  }

  // Simple pattern-based chiptune loop. Patterns: arrays of [note, len] over a scale.
  playMusic(name) {
    if (!this.ctx) { this._pendingMusic = name; return; }
    this.stopMusic();
    const SONGS = {
      // chill obby vibes
      chill: {
        bpm: 92, bassType: 'triangle', leadType: 'sine', bassVol: 0.09, leadVol: 0.07,
        bass: [131, 131, 98, 98, 110, 110, 123, 123],
        lead: [523, 0, 659, 587, 523, 0, 440, 494, 523, 587, 659, 0, 587, 523, 494, 0]
      },
      // fast driving speedrun music
      drive: {
        bpm: 168, bassType: 'sawtooth', leadType: 'square', bassVol: 0.10, leadVol: 0.06,
        bass: [110, 110, 110, 110, 87, 87, 87, 87, 98, 98, 98, 98, 73, 73, 82, 82],
        lead: [440, 523, 659, 523, 440, 523, 659, 880, 392, 494, 587, 494, 392, 494, 587, 784,
               440, 523, 659, 523, 880, 659, 523, 440, 349, 440, 523, 440, 587, 523, 494, 440]
      }
    };
    const s = SONGS[name];
    if (!s) return;
    const beat = 60 / s.bpm / 2; // 8th notes
    let step = 0;
    const tick = () => {
      const b = s.bass[step % s.bass.length];
      const l = s.lead[step % s.lead.length];
      if (b) this._tone({ f0: b, dur: beat * 0.9, type: s.bassType, vol: s.bassVol });
      if (l) this._tone({ f0: l, dur: beat * 0.85, type: s.leadType, vol: s.leadVol });
      step++;
    };
    tick();
    this._musicTimer = setInterval(tick, beat * 1000);
  }

  stopMusic() {
    if (this._musicTimer) { clearInterval(this._musicTimer); this._musicTimer = null; }
    this._pendingMusic = null;
  }
}
