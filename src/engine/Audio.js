// BloxWorlds Engine — Audio: WebAudio SFX + procedural background music.
// v2: no more "beeps" — soft waveforms, lowpass-filtered mix, attack/release
// envelopes, detuned warm leads, and a kick/hat drum groove under the music.
export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this._musicTimer = null;
    this._pendingMusic = null;
    const unlock = () => {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();

        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);

        // music goes through a warm lowpass so nothing sounds like a beeper
        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.value = 0.8;
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 2400;
        lp.Q.value = 0.4;
        this.musicBus.connect(lp);
        lp.connect(this.master);

        this.sfxBus = this.ctx.createGain();
        this.sfxBus.gain.value = 1.0;
        const lp2 = this.ctx.createBiquadFilter();
        lp2.type = 'lowpass';
        lp2.frequency.value = 5200;
        this.sfxBus.connect(lp2);
        lp2.connect(this.master);

        if (this._pendingMusic) { const m = this._pendingMusic; this._pendingMusic = null; this.playMusic(m); }
      } else if (this.ctx.state === 'suspended') this.ctx.resume();
    };
    for (const e of ['pointerdown', 'keydown', 'touchstart']) {
      window.addEventListener(e, unlock, { passive: true });
    }
  }

  // soft tone: attack/release envelope + optional detuned second osc for warmth
  _tone({ f0 = 440, f1 = null, dur = 0.15, type = 'sine', vol = 0.2, delay = 0, bus = null, detune = 0, attack = 0.012 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    g.connect(bus || this.sfxBus);
    const mk = (dt) => {
      const o = this.ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
      if (dt) o.detune.value = dt;
      o.connect(g);
      o.start(t); o.stop(t + dur + 0.03);
    };
    mk(0);
    if (detune) mk(detune);
  }

  _noise({ dur = 0.2, vol = 0.2, f = 800, delay = 0, bus = null, hp = false }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const n = Math.max(1, (this.ctx.sampleRate * dur) | 0);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const flt = this.ctx.createBiquadFilter();
    flt.type = hp ? 'highpass' : 'lowpass';
    flt.frequency.value = f;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(flt); flt.connect(g); g.connect(bus || this.sfxBus);
    src.start(t);
  }

  // punchy kick: sine pitch-drop
  _kick(delay = 0, vol = 0.32) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(g); g.connect(this.musicBus);
    o.start(t); o.stop(t + 0.2);
  }

  _hat(delay = 0, vol = 0.05) {
    this._noise({ dur: 0.04, vol, f: 6000, delay, bus: this.musicBus, hp: true });
  }

  play(name) {
    switch (name) {
      case 'jump':
        this._tone({ f0: 300, f1: 620, dur: 0.16, type: 'sine', vol: 0.18, detune: 8 });
        this._noise({ dur: 0.06, vol: 0.05, f: 1800 });
        break;
      case 'land':
        this._noise({ dur: 0.09, vol: 0.14, f: 420 });
        this._tone({ f0: 120, f1: 70, dur: 0.09, type: 'sine', vol: 0.12 });
        break;
      case 'death':
        this._tone({ f0: 280, f1: 70, dur: 0.45, type: 'triangle', vol: 0.22, detune: 10 });
        this._noise({ dur: 0.3, vol: 0.12, f: 700 });
        break;
      case 'checkpoint':
        this._tone({ f0: 523, dur: 0.14, type: 'triangle', vol: 0.16, detune: 6 });
        this._tone({ f0: 659, dur: 0.14, type: 'triangle', vol: 0.16, delay: 0.1, detune: 6 });
        this._tone({ f0: 784, dur: 0.22, type: 'triangle', vol: 0.16, delay: 0.2, detune: 6 });
        break;
      case 'win':
        [523, 659, 784, 1047, 784, 1047].forEach((f, i) =>
          this._tone({ f0: f, dur: 0.26, type: 'triangle', vol: 0.15, delay: i * 0.14, detune: 7 }));
        break;
      case 'portal':
        this._tone({ f0: 300, f1: 1400, dur: 0.4, type: 'sine', vol: 0.2, detune: 12 });
        this._noise({ dur: 0.35, vol: 0.06, f: 2400, hp: true });
        break;
      case 'chat':
        this._tone({ f0: 880, dur: 0.06, type: 'sine', vol: 0.07 });
        break;
    }
  }

  // Warm lo-fi grooves: bass + soft detuned lead + kick/hat pattern.
  playMusic(name) {
    if (!this.ctx) { this._pendingMusic = name; return; }
    this.stopMusic();
    const SONGS = {
      chill: {
        bpm: 88,
        bass: [131, 0, 98, 0, 110, 0, 123, 0],            // C G A B walk
        lead: [523, 0, 659, 587, 0, 523, 440, 0, 494, 523, 0, 587, 659, 0, 587, 0],
        leadType: 'sine', bassType: 'triangle',
        leadVol: 0.085, bassVol: 0.13,
        kick: [1, 0, 0, 0, 1, 0, 0, 0],
        hat: [0, 0, 1, 0, 0, 0, 1, 0]
      },
      drive: {
        bpm: 152,
        bass: [110, 110, 0, 110, 87, 87, 0, 87, 98, 98, 0, 98, 82, 82, 73, 82],
        lead: [440, 523, 659, 0, 440, 523, 659, 880, 392, 494, 587, 0, 392, 494, 587, 784,
               440, 523, 659, 0, 880, 659, 523, 440, 349, 440, 523, 0, 587, 523, 494, 440],
        leadType: 'triangle', bassType: 'triangle',
        leadVol: 0.075, bassVol: 0.14,
        kick: [1, 0, 0, 0, 1, 0, 1, 0],
        hat: [0, 1, 0, 1, 0, 1, 0, 1]
      }
    };
    const s = SONGS[name];
    if (!s) return;
    const beat = 60 / s.bpm / 2; // 8th notes
    let step = 0;
    const tick = () => {
      const b = s.bass[step % s.bass.length];
      const l = s.lead[step % s.lead.length];
      if (b) this._tone({ f0: b, dur: beat * 1.7, type: s.bassType, vol: s.bassVol, bus: this.musicBus, attack: 0.02 });
      if (l) this._tone({ f0: l, dur: beat * 1.4, type: s.leadType, vol: s.leadVol, bus: this.musicBus, detune: 9, attack: 0.03 });
      if (s.kick[step % s.kick.length]) this._kick();
      if (s.hat[step % s.hat.length]) this._hat();
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
