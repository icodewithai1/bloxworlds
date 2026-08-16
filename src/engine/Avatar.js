// BloxWorlds Engine — Avatar: legal from-scratch R6-style rig on Blox3D.
// Exact classic proportions (in studs, 1 stud = 0.5 units):
//   Torso 2 x 2 x 1  -> 1.0 x 1.0 x 0.5
//   Arms  1 x 2 x 1  -> 0.5 x 1.0 x 0.5, hanging flush at torso sides
//   Legs  1 x 2 x 1  -> 0.5 x 1.0 x 0.5
//   Head  cylinder ~1.2 wide with flat top + classic face decal
// Six joints (Motor6D-style): neck, lSh, rSh, lHip, rHip (+root).
// Animated by the Rig/Animator engine (idle/walk/run/jump/fall clips).
import {
  MeshBuilder, StandardMaterial, DynamicTexture, Texture, Color3, TransformNode, Mesh, Vector3
} from './blox3d.js';
import { clamp, lerp } from './Engine.js';
import { Animator, makeR6Clips } from './Rig.js';

export const CLOTHES = [null, 'shirt_blue', 'shirt_red', 'shirt_green'];
export const HAIR_STYLES = ['bacon', 'swoosh', 'spiky', 'bob', 'cap', 'none'];

const hex = (c) => '#' + (c >>> 0).toString(16).padStart(6, '0');
function shadeC(c, f) {
  const r = clamp((((c >> 16) & 255) * f) | 0, 0, 255);
  const g = clamp((((c >> 8) & 255) * f) | 0, 0, 255);
  const b = clamp(((c & 255) * f) | 0, 0, 255);
  return (r << 16) | (g << 8) | b;
}
const c3 = (c) => new Color3(((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255);

function flatMat(scene, color) {
  const m = new StandardMaterial('am', scene);
  m.diffuseColor = c3(color);
  m.specularColor = new Color3(0.03, 0.03, 0.03);
  return m;
}

// ---------- decals ----------
function drawFace(ctx) {
  ctx.clearRect(0, 0, 256, 256);
  const cx = 128;
  ctx.fillStyle = '#151515';
  ctx.beginPath(); ctx.ellipse(cx - 44, 108, 12, 17, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 44, 108, 12, 17, 0, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.beginPath(); ctx.ellipse(cx - 48, 102, 3.8, 5, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 40, 102, 3.8, 5, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#151515';
  ctx.lineWidth = 11; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, 120, 40, 0.45, Math.PI - 0.45); ctx.stroke();
}

function drawTorso(ctx, jacket, shirt, graphic) {
  ctx.fillStyle = hex(jacket); ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = hex(shirt); ctx.fillRect(30, 0, 68, 128);
  ctx.fillStyle = hex(shadeC(jacket, 1.35));
  ctx.fillRect(28, 0, 3, 128); ctx.fillRect(97, 0, 3, 128);
  if (graphic) {
    ctx.strokeStyle = hex(shadeC(shirt, 0.35));
    ctx.fillStyle = hex(shadeC(shirt, 0.35));
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(50, 84, 11, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(80, 84, 11, 0, 7); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(50, 84); ctx.lineTo(60, 62); ctx.lineTo(78, 62); ctx.lineTo(80, 84);
    ctx.lineTo(66, 74); ctx.closePath(); ctx.fill();
    ctx.fillRect(56, 54, 20, 6);
  }
}

function drawDenim(ctx, pants) {
  ctx.fillStyle = hex(pants); ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 420; i++) {
    ctx.fillStyle = hex(shadeC(pants, Math.random() < 0.5 ? 1.45 : 0.6));
    ctx.globalAlpha = 0.35;
    ctx.fillRect((Math.random() * 64) | 0, (Math.random() * 64) | 0, 1, Math.random() < 0.3 ? 2 : 1);
  }
  ctx.globalAlpha = 1;
}

// ---------- hair (thin shells hugging the head, r=0.6 cylinder) ----------
const HEAD_R = 0.6;
function buildHair(scene, parent, style, color) {
  if (style === 'none') return null;
  const m1 = flatMat(scene, color);
  const m2 = flatMat(scene, shadeC(color, 1.32));
  m1.backFaceCulling = false;
  m2.backFaceCulling = false;
  const g = new TransformNode('hair', scene);
  g.parent = parent;

  const cap = (h = 0.08, r = HEAD_R + 0.02, m = m1) => {
    const c = MeshBuilder.CreateCylinder('hcap', { diameter: r * 2, height: h, tessellation: 24 }, scene);
    c.material = m; c.parent = g;
    c.position.y = 0.3 + h / 2;
    return c;
  };
  const shell = (centerDeg, widthDeg, top, bottom, m = m1, rOff = 0.05) => {
    const r = HEAD_R + rOff;
    const h = top - bottom;
    const segAngle = 18;
    const n = Math.max(1, Math.round(widthDeg / segAngle));
    const segW = 2 * r * Math.tan((widthDeg / n) * Math.PI / 360) + 0.02;
    for (let i = 0; i < n; i++) {
      const aDeg = centerDeg - widthDeg / 2 + (i + 0.5) * (widthDeg / n);
      const a = aDeg * Math.PI / 180;
      const b = MeshBuilder.CreateBox('hs', { width: segW, height: h, depth: 0.07 }, scene);
      b.material = m; b.parent = g;
      b.position.set(Math.sin(a) * r, bottom + h / 2, Math.cos(a) * r);
      b.rotation.y = a;
    }
  };
  const cone = (r, h, x, y, z, rx = 0, rz = 0, m = m1) => {
    const c = MeshBuilder.CreateCylinder('hc', { diameterTop: 0, diameterBottom: r * 2, height: h, tessellation: 8 }, scene);
    c.material = m; c.parent = g;
    c.position.set(x, y, z);
    c.rotation.x = rx; c.rotation.z = rz;
  };

  switch (style) {
    case 'bacon':
      cap(0.09);
      shell(0, 40, 0.32, 0.14, m1);
      shell(-32, 22, 0.32, 0.2, m2);
      shell(32, 22, 0.32, 0.17, m1);
      shell(90, 50, 0.32, 0.05, m2);
      shell(-90, 50, 0.32, 0.08, m1);
      shell(180, 90, 0.32, 0, m1);
      break;
    case 'swoosh':
      cap(0.09);
      shell(-16, 56, 0.32, 0.12, m1);
      shell(26, 24, 0.32, 0.19, m2);
      shell(112, 62, 0.32, 0.03, m1);
      shell(-112, 62, 0.32, 0.03, m2);
      cone(0.1, 0.28, -0.3, 0.42, 0.38, 1.1, 0.55, m2);
      break;
    case 'spiky':
      cap(0.08);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        cone(0.1, 0.26, Math.cos(a) * 0.32, 0.42, Math.sin(a) * 0.32,
          Math.sin(a) * 0.4, -Math.cos(a) * 0.4, i % 2 ? m2 : m1);
      }
      cone(0.11, 0.3, 0, 0.48, 0, 0, 0, m2);
      break;
    case 'bob':
      cap(0.1);
      shell(0, 60, 0.32, 0.12, m1);
      shell(90, 52, 0.32, -0.3, m1);
      shell(-90, 52, 0.32, -0.3, m1);
      shell(180, 105, 0.32, -0.34, m2);
      break;
    case 'cap': {
      cap(0.11, HEAD_R + 0.04, m1);
      shell(180, 190, 0.32, 0.12, m1, 0.055);
      const brim = MeshBuilder.CreateBox('brim', { width: 0.62, height: 0.05, depth: 0.34 }, scene);
      brim.material = m1; brim.parent = g;
      brim.position.set(0, 0.34, HEAD_R + 0.14);
      const btn = MeshBuilder.CreateSphere('btn', { diameter: 0.1, segments: 6 }, scene);
      btn.material = m2; btn.parent = g;
      btn.position.y = 0.46;
      break;
    }
  }
  return g;
}

export class Avatar {
  constructor(engine, look = {}) {
    const scene = engine.scene;
    this.scene = scene;
    // default look = classic gray (like the reference: pale gray blocky guest)
    const skin = look.skin ?? 0xd5d8dd;
    const shirt = look.shirt ?? 0x1f7fd1;
    const jacket = look.jacket ?? 0x17181a;
    const pants = look.pants ?? 0x2a332a;
    const hairC = look.hair ?? 0x7a4a21;
    const style = look.style || 'bacon';

    const mSkin = flatMat(scene, skin);
    const mJacket = flatMat(scene, jacket);
    const denimTex = new DynamicTexture('denim', { width: 64, height: 64 }, scene);
    drawDenim(denimTex.getContext(), pants);
    denimTex.update();
    const mDenim = new StandardMaterial('mdenim', scene);
    mDenim.diffuseTexture = denimTex;
    mDenim.specularColor = new Color3(0.03, 0.03, 0.03);
    const mShoe = flatMat(scene, 0xf5f5f5);
    const mSole = flatMat(scene, 0x22252a);

    const root = new TransformNode('avatar', scene);
    this.group = root;
    this.meshes = [];
    const reg = (m) => { this.meshes.push(m); return m; };

    // ---- R6 Torso 1.0 x 1.0 x 0.5 spanning y 1.0..2.0
    const torsoTex = new DynamicTexture('torso', { width: 128, height: 128 }, scene);
    drawTorso(torsoTex.getContext(), jacket, shirt, true);
    torsoTex.update();
    const mTorso = new StandardMaterial('mtorso', scene);
    mTorso.diffuseTexture = torsoTex;
    mTorso.specularColor = new Color3(0.03, 0.03, 0.03);
    const edge = { x: 0, y: 0, z: 0.05, w: 1 };
    const full = { x: 0, y: 0, z: 1, w: 1 };
    const torso = reg(MeshBuilder.CreateBox('torso', {
      width: 1.0, height: 1.0, depth: 0.5,
      faceUV: [full, full, edge, edge, edge, edge]
    }, scene));
    const clothesId = CLOTHES[look.clothes | 0] || null;
    if (clothesId) {
      const cm = new StandardMaterial('mclothes', scene);
      cm.diffuseTexture = new Texture('assets/clothes/' + clothesId + '.jpg', scene);
      cm.specularColor = new Color3(0.03, 0.03, 0.03);
      torso.material = cm;
    } else {
      torso.material = mTorso;
    }
    torso.parent = root;
    torso.position.y = 1.5;

    // ---- Head: cylinder 1.2 wide, 0.6 tall on neck joint
    const neck = new TransformNode('neck', scene);
    neck.parent = root;
    neck.position.y = 2.0;
    const head = reg(MeshBuilder.CreateCylinder('head', {
      diameter: HEAD_R * 2, height: 0.6, tessellation: 28
    }, scene));
    head.material = mSkin;
    head.parent = neck;
    head.position.y = 0.31;

    // face decal plane on the front
    const faceTex = new DynamicTexture('face', { width: 256, height: 256 }, scene);
    drawFace(faceTex.getContext());
    faceTex.update();
    faceTex.hasAlpha = true;
    const mFace = new StandardMaterial('mface', scene);
    mFace.diffuseTexture = faceTex;
    mFace.useAlphaFromDiffuseTexture = true;
    mFace.specularColor = new Color3(0, 0, 0);
    mFace.backFaceCulling = false;
    const face = MeshBuilder.CreatePlane('facep', { width: 0.82, height: 0.62, sideOrientation: Mesh.DOUBLESIDE }, scene);
    face.material = mFace;
    face.parent = neck;
    face.position.set(0, 0.31, HEAD_R + 0.015);

    const hairMount = new TransformNode('hairmount', scene);
    hairMount.parent = neck;
    hairMount.position.y = 0.31;
    buildHair(scene, hairMount, style, hairC);
    hairMount.getChildMeshes().forEach((m) => this.meshes.push(m));

    // ---- Arms: 0.5 x 1.0 x 0.5, shoulder joint at torso top corner
    const makeArm = (side) => {
      const sh = new TransformNode(side < 0 ? 'lSh' : 'rSh', scene);
      sh.parent = root;
      sh.position.set(side * 0.75, 1.95, 0);
      const arm = reg(MeshBuilder.CreateBox('arm', { width: 0.5, height: 1.0, depth: 0.5 }, scene));
      arm.material = mJacket;
      arm.parent = sh;
      arm.position.y = -0.45;
      const hand = reg(MeshBuilder.CreateBox('hand', { width: 0.5, height: 0.16, depth: 0.5 }, scene));
      hand.material = mSkin;
      hand.parent = sh;
      hand.position.y = -0.98;
      return sh;
    };

    // ---- Legs: 0.5 x 1.0 x 0.5 from hip joints
    const makeLeg = (side) => {
      const hip = new TransformNode(side < 0 ? 'lHip' : 'rHip', scene);
      hip.parent = root;
      hip.position.set(side * 0.25, 1.0, 0);
      const leg = reg(MeshBuilder.CreateBox('leg', { width: 0.5, height: 1.0, depth: 0.5 }, scene));
      leg.material = mDenim;
      leg.parent = hip;
      leg.position.y = -0.5;
      const foot = reg(MeshBuilder.CreateBox('foot', { width: 0.52, height: 0.12, depth: 0.62 }, scene));
      foot.material = mShoe;
      foot.parent = hip;
      foot.position.set(0, -0.94, 0.05);
      const sole = reg(MeshBuilder.CreateBox('sole', { width: 0.54, height: 0.05, depth: 0.64 }, scene));
      sole.material = mSole;
      sole.parent = hip;
      sole.position.set(0, -1.02, 0.05);
      return hip;
    };

    // ---- RIG: named joints -> animation engine
    const lSh = makeArm(-1), rSh = makeArm(1);
    const lHip = makeLeg(-1), rHip = makeLeg(1);
    this.joints = { neck, lSh, rSh, lHip, rHip };
    this.animator = new Animator(this.joints);
    for (const clip of makeR6Clips()) this.animator.addClip(clip);
    this.animator.play('idle');

    // legacy handles some code still pokes at
    this.neck = neck;
    this.la = { sh: lSh }; this.ra = { sh: rSh };
    this.ll = { hip: lHip }; this.rl = { hip: rHip };

    // ---- chat bubble mount
    this._bubble = null;
    this._bubbleTimer = null;

    for (const m of this.meshes) engine.addShadows(m);
  }

  setNameTag(name) {
    const scene = this.scene;
    const tex = new DynamicTexture('tag', { width: 512, height: 128 }, scene);
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, 512, 128);
    ctx.font = '600 44px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // clean Roblox-like: plain white text w/ soft shadow, no pill
    ctx.shadowColor = 'rgba(0,0,0,.65)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#fff';
    ctx.fillText(name, 256, 64);
    tex.update();
    tex.hasAlpha = true;

    const plane = MeshBuilder.CreatePlane('tagp', { width: 3.0, height: 0.75, sideOrientation: Mesh.DOUBLESIDE }, scene);
    const m = new StandardMaterial('tagm', scene);
    m.diffuseTexture = tex;
    m.emissiveColor = new Color3(1, 1, 1);
    m.disableLighting = true;
    m.useAlphaFromDiffuseTexture = true;
    m.backFaceCulling = false;
    plane.material = m;
    plane.parent = this.group;
    plane.position.y = 3.15;
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
    plane.applyFog = false;
    return this;
  }

  // Roblox-style chat bubble above the head (auto-hides)
  say(text) {
    const scene = this.scene;
    if (this._bubble) { this._bubble.dispose(); this._bubble = null; }
    if (this._bubbleTimer) clearTimeout(this._bubbleTimer);

    text = String(text).slice(0, 80);
    const tex = new DynamicTexture('bub', { width: 512, height: 160 }, scene);
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, 512, 160);
    ctx.font = '500 34px Arial';
    // measure + wrap up to 2 lines
    const words = text.split(' ');
    const lines = [''];
    for (const w of words) {
      const t = (lines[lines.length - 1] + ' ' + w).trim();
      if (ctx.measureText(t).width > 420 && lines[lines.length - 1]) lines.push(w);
      else lines[lines.length - 1] = t;
      if (lines.length > 2) { lines[1] += '…'; break; }
    }
    const wMax = Math.min(Math.max(...lines.map((l) => ctx.measureText(l).width)) + 48, 500);
    const h = lines.length > 1 ? 118 : 84;
    const x0 = (512 - wMax) / 2, y0 = (140 - h) / 2;
    // white rounded bubble + tail
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x0, y0, wMax, h, 16);
    else ctx.rect(x0, y0, wMax, h);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(236, y0 + h - 2); ctx.lineTo(256, y0 + h + 18); ctx.lineTo(276, y0 + h - 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, 256, y0 + h / 2 + (i - (lines.length - 1) / 2) * 38));
    tex.update();
    tex.hasAlpha = true;

    const plane = MeshBuilder.CreatePlane('bubp', { width: 3.4, height: 1.06, sideOrientation: Mesh.DOUBLESIDE }, scene);
    const m = new StandardMaterial('bubm', scene);
    m.diffuseTexture = tex;
    m.emissiveColor = new Color3(1, 1, 1);
    m.disableLighting = true;
    m.useAlphaFromDiffuseTexture = true;
    m.backFaceCulling = false;
    plane.material = m;
    plane.parent = this.group;
    plane.position.y = 3.85;
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
    plane.applyFog = false;
    this._bubble = plane;
    this._bubbleTimer = setTimeout(() => {
      if (this._bubble) { this._bubble.dispose(); this._bubble = null; }
    }, 6000);
  }

  // state machine -> animation engine
  animate(dt, speed, grounded, velY = 0) {
    const anim = this.animator;
    if (!grounded) {
      anim.play(velY > 1 ? 'jump' : 'fall', { fade: 0.08 });
    } else if (speed > 11) {
      anim.play('run', { fade: 0.12 });
      anim.setRate(clamp(speed / 16, 0.85, 1.6));
    } else if (speed > 0.5) {
      anim.play('walk', { fade: 0.12 });
      anim.setRate(clamp(speed / 9.4, 0.6, 1.4));
    } else {
      anim.play('idle', { fade: 0.25 });
      anim.setRate(1);
    }
    anim.update(dt);
  }

  // hide/show body for first-person or camera-inside-character
  setVisible(v) {
    for (const m of this.meshes) m.isVisible = v;
  }

  dispose() {
    if (this._bubbleTimer) clearTimeout(this._bubbleTimer);
    this.group.dispose(false, true);
  }
}
