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
  return canvasTex(512, 128, (ctx) => {
    ctx.fillStyle = hex(skin); ctx.fillRect(0, 0, 512, 128);
    // CylinderGeometry: u=0.5 faces -z; head mesh is rotated PI so this
    // strip ends up on +z — the same side as the torso's shirt front.
    const cx = 256;
    // face sits on the LOWER 2/3 of the head so hair fringe never covers it
    ctx.fillStyle = '#151515';
    ctx.beginPath(); ctx.ellipse(cx - 40, 62, 10, 14, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 40, 62, 10, 14, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath(); ctx.ellipse(cx - 43, 57, 3.2, 4.2, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 37, 57, 3.2, 4.2, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#151515';
    ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, 72, 34, 0.45, Math.PI - 0.45); ctx.stroke();
  });
}

// ---------- carefully modeled hairstyles ----------
// Subtle, low-profile hair built from thin curved shells that hug the
// cylinder head. The head must still read as a clean cylinder with a flat
// top, so: thin cap disc, fringe stays ABOVE the face line (y >= 0.12),
// nothing bulges more than 0.04 past the head radius.
// Head-local coords: center y=0, flat top at y=+0.3, radius 0.4.
const HEAD_R = 0.4;
function buildHair(style, color) {
  const m1 = new THREE.MeshStandardMaterial({ color, roughness: 0.62 });
  const m2 = new THREE.MeshStandardMaterial({ color: shade(color, 1.32), roughness: 0.62 });
  const g = new THREE.Group();

  // thin disc on the flat top — like painted-on hair, keeps the top visible
  const cap = (h = 0.06, r = HEAD_R + 0.015, m = m1) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), m);
    c.position.y = 0.3 + h / 2;
    c.castShadow = true;
    g.add(c);
    return c;
  };
  // thin curved shell hugging the head. theta 0 = +z (face direction).
  const shell = (centerDeg, widthDeg, top, bottom, m = m1, rOff = 0.03) => {
    const L = (widthDeg * Math.PI) / 180;
    const start = ((centerDeg * Math.PI) / 180) - L / 2;
    const h = top - bottom;
    const mm = m.clone();
    mm.side = THREE.DoubleSide;
    const s = new THREE.Mesh(
      new THREE.CylinderGeometry(HEAD_R + rOff, HEAD_R + rOff, h, 16, 1, true, start, L),
      mm
    );
    s.position.y = bottom + h / 2;
    s.castShadow = true;
    g.add(s);
    return s;
  };
  const cone = (r, h, x, y, z, rx = 0, rz = 0, m = m1) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), m);
    c.position.set(x, y, z);
    c.rotation.set(rx, 0, rz);
    c.castShadow = true;
    g.add(c);
    return c;
  };

  switch (style) {
    case 'bacon': // classic messy: thin cap + short jagged fringe
      cap(0.07);
      shell(0, 40, 0.30, 0.16, m1);        // fringe center
      shell(-32, 22, 0.30, 0.20, m2);      // shorter tuft
      shell(32, 22, 0.30, 0.18, m1);       // tuft
      shell(90, 50, 0.30, 0.08, m2);       // side
      shell(-90, 50, 0.30, 0.10, m1);      // side
      shell(180, 90, 0.30, 0.02, m1);      // back, slightly longer
      break;
    case 'swoosh': // side-swept fringe with a flick
      cap(0.07);
      shell(-16, 56, 0.30, 0.14, m1);      // swept fringe
      shell(26, 24, 0.30, 0.20, m2);
      shell(112, 62, 0.30, 0.06, m1);      // side+back
      shell(-112, 62, 0.30, 0.06, m2);
      cone(0.07, 0.2, -0.2, 0.4, 0.26, 1.1, 0.55, m2); // flick tip
      break;
    case 'spiky':
      cap(0.06);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        cone(0.07, 0.2, Math.cos(a) * 0.22, 0.4, Math.sin(a) * 0.22,
          Math.sin(a) * 0.4, -Math.cos(a) * 0.4, i % 2 ? m2 : m1);
      }
      cone(0.08, 0.24, 0, 0.44, 0, 0, 0, m2);
      break;
    case 'bob': // straight fringe + curtains (still above chin)
      cap(0.08);
      shell(0, 60, 0.30, 0.14, m1);        // straight fringe
      shell(90, 52, 0.30, -0.22, m1);      // curtain
      shell(-90, 52, 0.30, -0.22, m1);     // curtain
      shell(180, 105, 0.30, -0.26, m2);    // back
      break;
    case 'cap': { // low-profile baseball cap
      cap(0.09, HEAD_R + 0.03, m1);
      shell(180, 190, 0.30, 0.14, m1, 0.035); // shallow band, back half
      const brim = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.24), m1);
      brim.position.set(0, 0.31, HEAD_R + 0.1);
      brim.castShadow = true;
      g.add(brim);
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), m2);
      btn.position.y = 0.41;
      g.add(btn);
      shell(115, 34, 0.14, 0.02, m2);      // tufts under the cap
      shell(-115, 34, 0.14, 0.02, m2);
      break;
    }
    default:
      break;
  }
  return g;
}

export const HAIR_STYLES = ['bacon', 'swoosh', 'spiky', 'bob', 'cap'];

// Classic R6 proportions (1 stud = 0.5 units):
// Torso 2×2×1 studs, Arms 1×2×1, Legs 1×2×1, cylinder head ~1.2 studs wide.
// Whole-arm swing from the shoulder, whole-leg swing from the hip — like R6.
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
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.castShadow = m.receiveShadow = true;
      return m;
    };
    const pivot = (x, y, z) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      return g;
    };

    const root = new THREE.Group();

    // ---- R6 Torso: 2×2×1 studs (1.0 × 1.0 × 0.5)
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 1.0, 0.5),
      [mJacket, mJacket, mJacket, mJacket, mShirtF, mShirtB]
    );
    torso.castShadow = torso.receiveShadow = true;
    torso.position.y = 1.5; // torso spans 1.0 → 2.0
    root.add(torso);

    // ---- Head: cylinder (classic look), face wrapped on the side
    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 0.6, 28),
      [mHead, mSkin, mSkin]
    );
    head.castShadow = head.receiveShadow = true;
    head.rotation.y = Math.PI;
    const neck = pivot(0, 2.0, 0);
    neck.add(head);
    head.position.y = 0.32;
    root.add(neck);

    // ---- hair mesh hugging the top of the cylinder
    const hair = buildHair(style, hairC);
    // hair is modeled in head-local space (theta 0 = +z face direction);
    // head mesh is rotated PI, so rotate hair back so its front matches the face
    hair.position.y = 0;
    hair.rotation.y = Math.PI;
    head.add(hair);

    // ---- R6 Arms: full 1×2×1 blocks swinging from the shoulder
    const makeArm = (side) => {
      const sh = pivot(side * 0.75, 1.95, 0); // shoulder at torso top corner
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 1.0, 0.5),
        // jacket sleeve top half, skin bottom (classic shirt look via texture split)
        [mJacket, mJacket, mJacket, mSkin, mJacket, mJacket]
      );
      arm.castShadow = arm.receiveShadow = true;
      arm.position.y = -0.45;
      sh.add(arm);
      root.add(sh);
      return { sh };
    };

    // ---- R6 Legs: full 1×2×1 blocks from the hip
    const makeLeg = (side) => {
      const hip = pivot(side * 0.25, 1.0, 0);
      const leg = box(0.5, 1.0, 0.5, mDenim);
      leg.position.y = -0.5;
      hip.add(leg);
      const foot = box(0.52, 0.12, 0.62, mShoe);
      foot.position.set(0, -0.94, 0.05);
      hip.add(foot);
      const sole = box(0.54, 0.05, 0.64, mSole);
      sole.position.set(0, -1.02, 0.05);
      hip.add(sole);
      root.add(hip);
      return { hip };
    };

    this.group = root;
    this.neck = neck;
    this.la = makeArm(-1); this.ra = makeArm(1);
    this.ll = makeLeg(-1); this.rl = makeLeg(1);
    // natural resting pose: arms slightly out from the torso
    this.la.sh.rotation.z = 0.06;
    this.ra.sh.rotation.z = -0.06;
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
