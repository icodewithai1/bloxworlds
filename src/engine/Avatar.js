// BloxWorlds Engine — Avatar: R15-inspired 15-part character
// "Bacon-hair era" upgrade: rounded parts, hair mesh, clothing textures,
// shirt graphic, denim jeans, sneakers.
import * as THREE from 'three';
import { clamp, lerp } from './Engine.js';

// ---------- helpers ----------
const hex = (c) => '#' + (c >>> 0).toString(16).padStart(6, '0');
function shade(c, f) {
  const r = clamp((((c >> 16) & 255) * f) | 0, 0, 255);
  const g = clamp((((c >> 8) & 255) * f) | 0, 0, 255);
  const b = clamp(((c & 255) * f) | 0, 0, 255);
  return (r << 16) | (g << 8) | b;
}

// Rounded (chamfered) box — gives parts the soft beveled edges real
// character parts have instead of razor-sharp boxes.
function roundedBoxGeo(w, h, d, r = 0.05) {
  r = Math.min(r, w / 2, h / 2, d / 2);
  const g = new THREE.BoxGeometry(w, h, d, 4, 4, 4);
  const pos = g.attributes.position;
  const v = new THREE.Vector3(), c = new THREE.Vector3();
  const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    c.set(clamp(v.x, -hx, hx), clamp(v.y, -hy, hy), clamp(v.z, -hz, hz));
    const n = v.sub(c);
    if (n.lengthSq() > 1e-10) n.normalize(); else n.set(0, 0, 1);
    pos.setXYZ(i, c.x + n.x * r, c.y + n.y * r, c.z + n.z * r);
  }
  g.computeVertexNormals();
  return g;
}

function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'));
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Shirt-front texture: open jacket sides + shirt panel (+ optional graphic)
function torsoTexture(jacket, shirt, graphic) {
  return canvasTex(128, 128, (ctx) => {
    ctx.fillStyle = hex(jacket);
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = hex(shirt);
    ctx.fillRect(30, 0, 68, 128);
    // jacket inner edge shading
    ctx.fillStyle = hex(shade(jacket, 1.35));
    ctx.fillRect(28, 0, 3, 128);
    ctx.fillRect(97, 0, 3, 128);
    if (graphic) {
      // motorcycle-ish print like the classic shirt
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

// Denim texture: base + speckle noise + seams
function denimTexture(pants) {
  return canvasTex(64, 64, (ctx) => {
    ctx.fillStyle = hex(pants);
    ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 420; i++) {
      const l = Math.random() < 0.5;
      ctx.fillStyle = hex(shade(pants, l ? 1.45 : 0.6));
      ctx.globalAlpha = 0.35;
      ctx.fillRect((Math.random() * 64) | 0, (Math.random() * 64) | 0, 1, Math.random() < 0.3 ? 2 : 1);
    }
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = hex(shade(pants, 0.55));
    ctx.fillRect(0, 0, 2, 64);
    ctx.fillRect(62, 0, 2, 64);
    ctx.globalAlpha = 1;
  });
}

function faceTexture() {
  return canvasTex(128, 128, (ctx) => {
    ctx.fillStyle = '#0b0b0b';
    // oval eyes
    ctx.beginPath(); ctx.ellipse(42, 46, 8, 12, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(86, 46, 8, 12, 0, 0, 7); ctx.fill();
    // big smile
    ctx.strokeStyle = '#0b0b0b';
    ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(64, 58, 30, 0.3, Math.PI - 0.3); ctx.stroke();
  });
}

export class Avatar {
  constructor(look = {}) {
    const skin = look.skin ?? 0xf3f3f3;      // classic pale head/hands
    const shirt = look.shirt ?? 0x1f7fd1;    // blue tee
    const jacket = look.jacket ?? 0x17181a;  // black jacket
    const pants = look.pants ?? 0x2a332a;    // dark denim
    const hair = look.hair ?? 0x7a4a21;      // bacon brown

    const mSkin = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.55 });
    const mJacket = new THREE.MeshStandardMaterial({ color: jacket, roughness: 0.72 });
    const mShirtF = new THREE.MeshStandardMaterial({ map: torsoTexture(jacket, shirt, true), roughness: 0.72 });
    const mShirtF2 = new THREE.MeshStandardMaterial({ map: torsoTexture(jacket, shirt, false), roughness: 0.72 });
    const mDenim = new THREE.MeshStandardMaterial({ map: denimTexture(pants), roughness: 0.85 });
    const mShoe = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.45 });
    const mSole = new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.6 });
    const mHair = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.6 });
    const mHair2 = new THREE.MeshStandardMaterial({ color: shade(hair, 1.35), roughness: 0.6 });

    const rpart = (w, h, d, mat, r) => {
      const m = new THREE.Mesh(roundedBoxGeo(w, h, d, r), mat);
      m.castShadow = m.receiveShadow = true;
      return m;
    };
    // textured torso: plain box so the front face UVs stay clean
    const tpart = (w, h, d, frontMat, sideMat) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        [sideMat, sideMat, sideMat, sideMat, frontMat, sideMat]
      );
      m.castShadow = m.receiveShadow = true;
      return m;
    };
    const pivot = (x, y, z) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      return g;
    };

    const root = new THREE.Group();

    // torso (jacket + shirt front)
    const lowerTorso = tpart(0.9, 0.35, 0.5, mShirtF2, mJacket); lowerTorso.position.y = 1.05; root.add(lowerTorso);
    const upperTorso = tpart(1.0, 0.75, 0.5, mShirtF, mJacket); upperTorso.position.y = 1.62; root.add(upperTorso);

    // head (rounded) + face
    const head = rpart(0.68, 0.66, 0.68, mSkin, 0.16);
    head.position.y = 2.35;
    root.add(head);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.6),
      new THREE.MeshBasicMaterial({ map: faceTexture(), transparent: true })
    );
    face.position.set(0, 0, 0.345);
    head.add(face);

    // messy hair mesh (several offset chunks, two tones)
    const hairG = new THREE.Group();
    const chunk = (w, h, d, x, y, z, rx, ry, rz, m2) => {
      const c = rpart(w, h, d, m2 ? mHair2 : mHair, 0.05);
      c.position.set(x, y, z);
      c.rotation.set(rx, ry, rz);
      hairG.add(c);
    };
    chunk(0.78, 0.24, 0.78, 0, 0.30, 0, 0, 0, 0);                  // cap
    chunk(0.74, 0.20, 0.20, 0, 0.20, 0.30, 0.25, 0, 0.06);         // front fringe
    chunk(0.30, 0.22, 0.24, -0.24, 0.16, 0.30, 0.32, 0, 0.35, 1);  // fringe tuft L
    chunk(0.26, 0.20, 0.22, 0.22, 0.18, 0.31, 0.28, 0, -0.3);      // fringe tuft R
    chunk(0.20, 0.34, 0.72, -0.32, 0.10, -0.02, 0, 0, 0.15);       // side L
    chunk(0.20, 0.30, 0.70, 0.33, 0.12, -0.03, 0, 0, -0.12, 1);    // side R
    chunk(0.72, 0.24, 0.26, 0, 0.22, -0.30, -0.28, 0, 0);          // back
    chunk(0.30, 0.16, 0.30, 0.10, 0.40, 0.06, 0.1, 0.5, -0.15, 1); // top tuft
    head.add(hairG);

    // arms: jacket sleeve upper, skin lower + hand
    const makeArm = (side) => {
      const sh = pivot(side * 0.66, 1.95, 0);
      const upper = rpart(0.32, 0.55, 0.32, mJacket, 0.06); upper.position.y = -0.27; sh.add(upper);
      const el = pivot(0, -0.55, 0); sh.add(el);
      const lower = rpart(0.28, 0.45, 0.28, mSkin, 0.06); lower.position.y = -0.22; el.add(lower);
      const hand = rpart(0.27, 0.22, 0.27, mSkin, 0.08); hand.position.y = -0.55; el.add(hand);
      root.add(sh);
      return { sh, el };
    };
    // legs: denim upper/lower, sneaker foot
    const makeLeg = (side) => {
      const hip = pivot(side * 0.25, 1.15, 0);
      const upper = rpart(0.37, 0.55, 0.41, mDenim, 0.05); upper.position.y = -0.28; hip.add(upper);
      const knee = pivot(0, -0.56, 0); hip.add(knee);
      const lower = rpart(0.35, 0.42, 0.39, mDenim, 0.05); lower.position.y = -0.2; knee.add(lower);
      const foot = rpart(0.36, 0.15, 0.52, mShoe, 0.06); foot.position.set(0, -0.47, 0.06); knee.add(foot);
      const sole = rpart(0.37, 0.06, 0.54, mSole, 0.02); sole.position.set(0, -0.565, 0.06); knee.add(sole);
      root.add(hip);
      return { hip, knee };
    };

    this.group = root;
    this.la = makeArm(-1); this.ra = makeArm(1);
    this.ll = makeLeg(-1); this.rl = makeLeg(1);
    this.phase = Math.random() * 6.28;
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
    if (ctx.roundRect) {
      ctx.beginPath(); ctx.roundRect((512 - w) / 2, 20, w, 88, 18); ctx.fill();
    } else {
      ctx.fillRect((512 - w) / 2, 20, w, 88);
    }
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

  animate(dt, speed, grounded) {
    this.phase += dt * (4 + speed * 2.2);
    const { la, ra, ll, rl } = this;
    const amp = grounded ? clamp(speed * 0.28, 0, 0.9) : 0.35;
    const s = Math.sin(this.phase);
    if (!grounded) {
      la.sh.rotation.x = lerp(la.sh.rotation.x, -2.6, dt * 10);
      ra.sh.rotation.x = lerp(ra.sh.rotation.x, -2.6, dt * 10);
      ll.hip.rotation.x = lerp(ll.hip.rotation.x, 0.5, dt * 10);
      rl.hip.rotation.x = lerp(rl.hip.rotation.x, -0.3, dt * 10);
      ll.knee.rotation.x = lerp(ll.knee.rotation.x, -0.8, dt * 10);
      rl.knee.rotation.x = lerp(rl.knee.rotation.x, -0.4, dt * 10);
    } else {
      la.sh.rotation.x = s * amp;
      ra.sh.rotation.x = -s * amp;
      ll.hip.rotation.x = -s * amp;
      rl.hip.rotation.x = s * amp;
      la.el.rotation.x = Math.max(0, -s) * amp * -0.7;
      ra.el.rotation.x = Math.max(0, s) * amp * -0.7;
      ll.knee.rotation.x = Math.max(0, s) * amp * -1.1;
      rl.knee.rotation.x = Math.max(0, -s) * amp * -1.1;
    }
  }
}
