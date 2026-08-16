// BloxWorlds Engine — Input: keyboard + mouse + mobile touch.
// Mobile: DYNAMIC joystick — appears wherever you first touch the left half
// of the screen and follows your drag; right side drags the camera.
import { clamp } from './Engine.js';

export class Input {
  constructor(canvas) {
    this.keys = {};
    this.moveX = 0;
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
      // Roblox-style orbit: drag right = look right, drag down = look down
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

    const joy = document.getElementById('joy');
    const knob = document.getElementById('joyknob');
    const jumpBtn = document.getElementById('jumpbtn');
    if (!joy) return;
    jumpBtn.style.display = 'flex';

    let joyId = null;      // touch id steering the stick
    let camId = null;      // touch id rotating the camera
    let originX = 0, originY = 0;
    const RANGE = 46;      // px of drag = full speed

    const showJoy = (x, y) => {
      joy.style.display = 'block';
      joy.style.left = (x - 55) + 'px';
      joy.style.top = (y - 55) + 'px';
      knob.style.transform = 'translate(0px, 0px)';
    };
    const hideJoy = () => {
      joy.style.display = 'none';
      this.moveX = this.moveZ = 0;
    };

    const onStart = (e) => {
      for (const t of e.changedTouches) {
        const el = document.elementFromPoint(t.clientX, t.clientY);
        if (el && (el.closest('#chat') || el.closest('#jumpbtn') || el.closest('#chatbtn') || el.closest('a') || el.closest('button') || el.closest('input'))) continue;
        if (t.clientX < window.innerWidth * 0.5 && joyId === null) {
          // dynamic joystick spawns at the touch point
          joyId = t.identifier;
          originX = t.clientX; originY = t.clientY;
          showJoy(originX, originY);
          e.preventDefault();
        } else if (camId === null) {
          camId = t.identifier;
          this._cpx = t.clientX; this._cpy = t.clientY;
        }
      }
    };

    const onMove = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) {
          let dx = t.clientX - originX, dy = t.clientY - originY;
          const len = Math.hypot(dx, dy);
          // NOT trapped: if you drag past the ring, the ring follows you
          if (len > RANGE) {
            const over = len - RANGE;
            originX += (dx / len) * over;
            originY += (dy / len) * over;
            joy.style.left = (originX - 55) + 'px';
            joy.style.top = (originY - 55) + 'px';
            dx = t.clientX - originX; dy = t.clientY - originY;
          }
          knob.style.transform = `translate(${dx}px, ${dy}px)`;
          this.moveX = clamp(dx / RANGE, -1, 1);
          this.moveZ = clamp(dy / RANGE, -1, 1);
          e.preventDefault();
        } else if (t.identifier === camId) {
          this.camYaw -= (t.clientX - this._cpx) * 0.006;
          this.camPitch = clamp(this.camPitch + (t.clientY - this._cpy) * 0.006, -0.2, 1.25);
          this._cpx = t.clientX; this._cpy = t.clientY;
        }
      }
    };

    const onEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) { joyId = null; hideJoy(); }
        if (t.identifier === camId) camId = null;
      }
    };

    window.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);

    jumpBtn.addEventListener('touchstart', (e) => { this.jump = true; e.preventDefault(); }, { passive: false });
    jumpBtn.addEventListener('touchend', () => { this.jump = false; });
  }

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
