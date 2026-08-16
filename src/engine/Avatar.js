// BloxWorlds Engine — Avatar
// Classic blocky build: block torso, slightly narrower block arms & legs,
// CYLINDER head with face decal and a modeled hair mesh on top.
// Several carefully-built hairstyles; walk/run/jump animations.
import * as THREE from 'three';
import { clamp, lerp } from './Engine.js';

const hex = (c) => '#' + (c >>> 0).toString(16).padStart(6, '0');
function shade(c, f) {
  const r = clamp((((c >> 16) & 255) * f) | 0, 0, 255);
  const g = clamp((((c >> 8) & 255) * f) | 0, 0, 255);
  const b = clamp(((c & 255) * f) | 0, 0, 255);
  return (r << 16) | (g << 8) | b;
}

function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'));
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function torsoTexture(jacket, shirt, graphic) {
  return canvasTex(128, 128, (ctx) => {
    ctx.fillStyle = hex(jacket); ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = hex(shirt); ctx.fillRect(30, 0, 68, 128);
    ctx.fillStyle = hex(shade(jacket, 1.35));
    ctx.fillRect(28, 0, 3, 128); ctx.fillRect(97, 0, 3, 128);
    if (graphic) {
      ctx.strokeStyle = hex(shade(shirt, 0.35));
      ctx.fillStyle = hex(shade(shirt, 0.35));
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(50, 84, 11, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(80, 84, 11, 0, 7); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(50, 84); ctx.lineTo(60, 62); ctx.lineTo(78, 62); ctx.lineTo(80, 84);
      ctx.lineTo(66, 74); ctx.closePath(); ctx.fill();
      ctx.fillRect(56, 54, 20, 6);
    }
  });
}

function denimTexture(pants) {
  return canvasTex(64, 64, (ctx) => {
    ctx.fillStyle = hex(pants); ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 420; i++) {
      ctx.fillStyle = hex(shade(pants, Math.random() < 0.5 ? 1.45 : 0.6));
      ctx.globalAlpha = 0.35;
      ctx.fillRect((Math.random() * 64) | 0, (Math.random() * 64) | 0, 1, Math.random() < 0.3 ? 2 : 1);
    }
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = hex(shade(pants, 0.55));
    ctx.fillRect(0, 0, 2, 64); ctx.fillRect(62, 0, 2, 64);
    ctx.globalAlpha = 1;
  });
}

// face drawn onto the cylinder head's side (wraps around) — we place features
// in the strip that faces forward.
function headTexture(skin) {
  return canvasTex(256, 128, (ctx) => {
    ctx.fillStyle = hex(skin); ctx.fillRect(0, 0, 256, 128);
    // cylinder UV: front of the head ≈ x=192 (three.js cylinder seam at +x, front -z depends on rotation; we rotate head so front strip is centered at x=192)
    const cx = 192;
    ctx.fillStyle = '#0b0b0b';
    ctx.beginPath(); ctx.ellipse(cx - 22, 52, 7, 11, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 22, 52, 7, 11, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#0b0b0b';
    ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, 62, 26, 0.35, Math.PI - 0.35); ctx.stroke();
  });
}

// ---------- carefully modeled hairstyles ----------
// each returns a Group positioned relative to head center (head r=0.42, h=0.62)
function buildHair(style, color) {
  const m1 = new THREE.MeshStandardMaterial({ color, roughness: 0.62 });
  const m2 = new THREE.MeshStandardMaterial({ color: shade(color, 1.32), roughness: 0.62 });
  const g = new THREE.Group();
  const box = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0, m = m1) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z); b.rotation.set(rx, ry, rz);
    b.castShadow = true;
    g.add(b); return b;
  };
  const cyl = (rt, rb, h, x, y, z, rx = 0, rz = 0, m = m1, seg = 10) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
    c.position.set(x, y, z); c.rotation.set(rx, 0, rz);
    c.castShadow = true;
    g.add(c); return c;
  };
  const sph = (r, x, y, z, sx = 1, sy = 1, sz = 1, m = m1) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), m);
    s.position.set(x, y, z); s.scale.set(sx, sy, sz);
    s.castShadow = true;
    g.add(s); return s;
  };

  switch (style) {
    case 'bacon': // messy layered fringe
      sph(0.46, 0, 0.16, 0, 1, 0.62, 1);                      // cap
      box(0.62, 0.16, 0.2, 0, 0.13, 0.34, 0.35, 0, 0.08);     // fringe main
      box(0.26, 0.2, 0.18, -0.22, 0.08, 0.34, 0.42, 0, 0.4, m2);
      box(0.22, 0.17, 0.16, 0.2, 0.1, 0.35, 0.36, 0, -0.32);
      box(0.16, 0.3, 0.5, -0.36, 0.02, -0.02, 0, 0, 0.18);    // sides
      box(0.16, 0.26, 0.48, 0.37, 0.04, -0.03, 0, 0, -0.15, m2);
      box(0.56, 0.2, 0.2, 0, 0.1, -0.33, -0.3, 0, 0);         // back
      box(0.24, 0.12, 0.24, 0.08, 0.3, 0.05, 0.1, 0.5, -0.15, m2); // top tuft
      break;
    case 'swoosh': // side-swept anime swoosh
      sph(0.46, 0, 0.16, 0, 1, 0.6, 1);
      cyl(0.1, 0.02, 0.5, -0.3, 0.1, 0.3, 1.15, 0.9, m2);     // big swoop
      cyl(0.09, 0.02, 0.44, -0.1, 0.16, 0.34, 1.2, 0.45);
      cyl(0.08, 0.02, 0.4, 0.12, 0.16, 0.33, 1.25, -0.3, m2);
      cyl(0.08, 0.02, 0.36, 0.3, 0.1, 0.28, 1.2, -0.8);
      box(0.16, 0.34, 0.46, -0.36, 0, -0.04, 0, 0, 0.12);
      box(0.16, 0.3, 0.46, 0.36, 0.02, -0.04, 0, 0, -0.12);
      box(0.6, 0.24, 0.18, 0, 0.06, -0.32, -0.25, 0, 0, m2);
      break;
    case 'spiky': // spiky anime hair
      sph(0.45, 0, 0.14, 0, 1, 0.55, 1);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        cyl(0.01, 0.09, 0.34, Math.cos(a) * 0.22, 0.38, Math.sin(a) * 0.22,
          Math.sin(a) * 0.5, Math.cos(a) * 0.5, i % 2 ? m1 : m2, 6);
      }
      cyl(0.01, 0.1, 0.4, 0, 0.44, 0, 0, 0, m2, 6);
      box(0.56, 0.18, 0.16, 0, 0.1, 0.32, 0.4, 0, 0);
      break;
    case 'bob': // neat bob with straight fringe
      sph(0.48, 0, 0.12, 0, 1, 0.72, 1);
      box(0.64, 0.14, 0.14, 0, 0.2, 0.36, 0.15, 0, 0);        // straight fringe
      box(0.18, 0.55, 0.44, -0.38, -0.12, -0.02);             // long sides
      box(0.18, 0.55, 0.44, 0.38, -0.12, -0.02);
      box(0.6, 0.5, 0.2, 0, -0.08, -0.34);                    // back curtain
      break;
    case 'cap': // baseball cap + tufts
      cyl(0.44, 0.46, 0.2, 0, 0.22, 0, 0, 0, m1, 14);
      sph(0.44, 0, 0.3, 0, 1, 0.5, 1);
      box(0.4, 0.06, 0.3, 0, 0.16, 0.5, 0.12);                // brim
      box(0.18, 0.14, 0.14, -0.3, 0.02, 0.3, 0, 0, 0.3, m2);  // hair tufts
      box(0.18, 0.14, 0.14, 0.3, 0.02, 0.3, 0, 0, -0.3, m2);
      break;
    default: // 'none'
      break;
  }
  return g;
}

export const HAIR_STYLES = ['bacon', 'swoosh', 'spiky', 'bob', 'cap'];

export class Avatar {
  constructor(look = {}) {
    const skin = look.skin ?? 0xf3f3f3;
    const shirt = look.shirt ?? 0x1f7fd1;
    const jacket = look.jacket ?? 0x17181a;
    const pants = look.pants ?? 0x2a332a;
    const hairC = look.hair ?? 0x7a4a21;
    const style = look.style || 'bacon';

    const mSkin = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.55 });
    const mHead = new THREE.MeshStandardMaterial({ map: headTexture(skin), roughness: 0.55 });
    const mJacket = new THREE.MeshStandardMaterial({ color: jacket, roughness: 0.72 });
    const mShirtF = new THREE.MeshStandardMaterial({ map: torsoTexture(jacket, shirt, true), roughness: 0.72 });
    const mShirtB = new THREE.MeshStandardMaterial({ map: torsoTexture(jacket, shirt, false), roughness: 0.72 });
    const mDenim = new THREE.MeshStandardMaterial({ map: denimTexture(pants), roughness: 0.85 });
    const mShoe = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.45 });
    const mSole = new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.6 });

    const box = (w, h, d, mat) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), Array.isArray(mat)
        ? mat : mat);
      m.castShadow = m.receiveShadow = true;
      return m;
    };
    const pivot = (x, y, z) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      return g;
    };

    const root = new THREE.Group();

    // ---- torso: one solid block (jacket sides, shirt front/back)
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 1.1, 0.5),
      [mJacket, mJacket, mJacket, mJacket, mShirtF, mShirtB]
    );
    torso.castShadow = torso.receiveShadow = true;
    torso.position.y = 1.45;
    root.add(torso);

    // ---- head: CYLINDER with wrapped face texture
    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.62, 20),
      [mHead, mSkin, mSkin] // side, top, bottom
    );
    head.castShadow = head.receiveShadow = true;
    // rotate so the face strip (u≈0.75) points forward (+z)
    head.rotation.y = Math.PI;
    const neck = pivot(0, 2.0, 0);
    neck.add(head);
    head.position.y = 0.33;
    root.add(neck);

    // ---- hair mesh on top of the cylinder
    const hair = buildHair(style, hairC);
    hair.position.y = 0.5;
    head.add(hair);
    // undo head yaw so hair faces forward
    hair.rotation.y = Math.PI;

    // ---- arms: a little less wide than torso blocks (single block, shoulder pivot)
    const makeArm = (side) => {
      const sh = pivot(side * 0.64, 1.92, 0);
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 1.0, 0.28),
        [mJacket, mJacket, mJacket, mJacket, mJacket, mSkin] // skin bottom (hand)
      );
      arm.castShadow = arm.receiveShadow = true;
      arm.position.y = -0.42;
      sh.add(arm);
      // little skin hand block
      const hand = box(0.29, 0.18, 0.29, mSkin);
      hand.position.y = -0.98;
      sh.add(hand);
      root.add(sh);
      return { sh };
    };

    // ---- legs: blocks a little less wide, hip pivot + sneaker
    const makeLeg = (side) => {
      const hip = pivot(side * 0.26, 0.95, 0);
      const leg = box(0.34, 0.82, 0.36, mDenim);
      leg.position.y = -0.4;
      hip.add(leg);
      const foot = box(0.35, 0.14, 0.5, mShoe);
      foot.position.set(0, -0.86, 0.06);
      hip.add(foot);
      const sole = box(0.36, 0.06, 0.52, mSole);
      sole.position.set(0, -0.945, 0.06);
      hip.add(sole);
      root.add(hip);
      return { hip };
    };

    this.group = root;
    this.neck = neck;
    this.la = makeArm(-1); this.ra = makeArm(1);
    this.ll = makeLeg(-1); this.rl = makeLeg(1);
    this.phase = Math.random() * 6.28;
    this._lean = 0;
  }

  setNameTag(name) {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 128;
    const ctx = cv.getContext('2d');
    ctx.font = 'bold 56px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    const w = Math.min(ctx.measureText(name).width + 44, 500);
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect((512 - w) / 2, 20, w, 88, 18); ctx.fill(); }
    else ctx.fillRect((512 - w) / 2, 20, w, 88);
    ctx.fillStyle = '#fff';
    ctx.fillText(name, 256, 66);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    sp.scale.set(3.2, 0.8, 1);
    sp.position.y = 3.35;
    this.group.add(sp);
    return this;
  }

  // speed-aware animation: idle sway -> walk -> RUN (arms pump, body leans)
  animate(dt, speed, grounded) {
    const running = speed > 11;
    this.phase += dt * (3 + speed * (running ? 1.6 : 2.0));
    const { la, ra, ll, rl } = this;
    const s = Math.sin(this.phase);
    const targetLean = grounded ? clamp(speed * 0.014, 0, 0.38) : 0.1;
    this._lean = lerp(this._lean, targetLean, dt * 6);
    this.group.rotation.x = this._lean * 0; // group yaw handled outside; lean via torso pivot below
    // whole-body lean while sprinting
    this.neck.rotation.x = this._lean * 0.5;

    if (!grounded) {
      la.sh.rotation.x = lerp(la.sh.rotation.x, -2.7, dt * 10);
      ra.sh.rotation.x = lerp(ra.sh.rotation.x, -2.7, dt * 10);
      ll.hip.rotation.x = lerp(ll.hip.rotation.x, 0.45, dt * 10);
      rl.hip.rotation.x = lerp(rl.hip.rotation.x, -0.3, dt * 10);
    } else if (running) {
      // sprint: bigger stride, arms pump bent & fast
      const amp = clamp(speed * 0.075, 0.9, 1.5);
      la.sh.rotation.x = s * amp;
      ra.sh.rotation.x = -s * amp;
      ll.hip.rotation.x = -s * amp;
      rl.hip.rotation.x = s * amp;
      la.sh.rotation.z = 0.12; ra.sh.rotation.z = -0.12;
    } else if (speed > 0.5) {
      // walk
      const amp = clamp(speed * 0.09, 0, 0.85);
      la.sh.rotation.x = s * amp;
      ra.sh.rotation.x = -s * amp;
      ll.hip.rotation.x = -s * amp;
      rl.hip.rotation.x = s * amp;
      la.sh.rotation.z = lerp(la.sh.rotation.z, 0, dt * 8);
      ra.sh.rotation.z = lerp(ra.sh.rotation.z, 0, dt * 8);
    } else {
      // idle: subtle breathing sway
      const t = this.phase * 0.35;
      la.sh.rotation.x = lerp(la.sh.rotation.x, Math.sin(t) * 0.05, dt * 4);
      ra.sh.rotation.x = lerp(ra.sh.rotation.x, -Math.sin(t) * 0.05, dt * 4);
      ll.hip.rotation.x = lerp(ll.hip.rotation.x, 0, dt * 6);
      rl.hip.rotation.x = lerp(rl.hip.rotation.x, 0, dt * 6);
      la.sh.rotation.z = lerp(la.sh.rotation.z, 0.03, dt * 4);
      ra.sh.rotation.z = lerp(ra.sh.rotation.z, -0.03, dt * 4);
    }
  }
}
