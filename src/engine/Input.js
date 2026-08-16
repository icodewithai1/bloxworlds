// BloxWorlds Engine — Input: keyboard + mouse + mobile touch (joystick & jump button)
import { clamp } from './Engine.js';

export class Input {
  constructor(canvas) {
    this.keys = {};
    this.moveX = 0;       // -1..1 from joystick
    this.moveZ = 0;
    this.jump = false;
    this.camYaw = 0;
    this.camPitch = 0.32;
    this.camDist = 9;
    this.chatOpen = false;
    this.isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

    window.addEventListener('keydown', (e) => {
      if (this.chatOpen) return;
      this.keys[e.code] = true;
      if (e.code === 'Space') { this.jump = true; e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'Space') this.jump = false;
    });

    // mouse camera
    let dragging = false, px = 0, py = 0;
    canvas.addEventListener('mousedown', (e) => { dragging = true; px = e.clientX; py = e.clientY; });
    window.addEventListener('mouseup', () => { dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      this.camYaw -= (e.clientX - px) * 0.0045;
      this.camPitch = clamp(this.camPitch + (e.clientY - py) * 0.0045, -0.2, 1.25);
      px = e.clientX; py = e.clientY;
    });
    window.addEventListener('wheel', (e) => {
      this.camDist = clamp(this.camDist + Math.sign(e.deltaY) * 1.2, 4, 18);
    });

    if (this.isTouch) this._setupTouch(canvas);
  }

  _setupTouch(canvas) {
    document.body.classList.add('touch');

    // joystick
    const stick = document.getElementById('joy');
    const knob = document.getElementById('joyknob');
    const jumpBtn = document.getElementById('jumpbtn');
    if (!stick) return;
    stick.style.display = jumpBtn.style.display = 'block';

    let joyId = null, jx = 0, jy = 0;
    const rectCenter = () => {
      const r = stick.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, rad: r.width / 2 };
    };
    const setKnob = (dx, dy) => {
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };

    stick.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      joyId = t.identifier;
      e.preventDefault();
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) {
          const c = rectCenter();
          let dx = t.clientX - c.x, dy = t.clientY - c.y;
          const len = Math.hypot(dx, dy);
          const max = c.rad * 0.7;
          if (len > max) { dx = dx / len * max; dy = dy / len * max; }
          setKnob(dx, dy);
          this.moveX = dx / max;
          this.moveZ = dy / max;
        } else if (t.identifier === this._camId) {
          this.camYaw -= (t.clientX - this._cpx) * 0.006;
          this.camPitch = clamp(this.camPitch + (t.clientY - this._cpy) * 0.006, -0.2, 1.25);
          this._cpx = t.clientX; this._cpy = t.clientY;
        }
      }
    }, { passive: false });

    const endJoy = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) {
          joyId = null; this.moveX = this.moveZ = 0; setKnob(0, 0);
        }
        if (t.identifier === this._camId) this._camId = null;
      }
    };
    window.addEventListener('touchend', endJoy);
    window.addEventListener('touchcancel', endJoy);

    // camera drag on the canvas (right side of screen)
    this._camId = null;
    canvas.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        if (this._camId === null && t.identifier !== joyId) {
          this._camId = t.identifier;
          this._cpx = t.clientX; this._cpy = t.clientY;
        }
      }
    }, { passive: true });

    jumpBtn.addEventListener('touchstart', (e) => { this.jump = true; e.preventDefault(); }, { passive: false });
    jumpBtn.addEventListener('touchend', () => { this.jump = false; });
  }

  // combined movement intent in local space (-1..1)
  intent() {
    let ix = this.moveX, iz = this.moveZ;
    if (this.keys.KeyW || this.keys.ArrowUp) iz -= 1;
    if (this.keys.KeyS || this.keys.ArrowDown) iz += 1;
    if (this.keys.KeyA || this.keys.ArrowLeft) ix -= 1;
    if (this.keys.KeyD || this.keys.ArrowRight) ix += 1;
    const len = Math.hypot(ix, iz);
    if (len > 1) { ix /= len; iz /= len; }
    return { x: ix, z: iz };
  }
}
