// BloxWorlds Engine — Avatar (Babylon.js)
// Classic R6 build: 2×2×1 block torso, full 1×2×1 block arms & legs,
// clean CYLINDER head with flat top, face decal on the front, and
// low-profile hair shells that hug the head.
import {
  MeshBuilder, StandardMaterial, DynamicTexture, Texture, Color3, TransformNode, Mesh, Vector3
} from './blox3d.js';

// real 2D clothing textures; id 0 = flat colors
export const CLOTHES = [null, 'shirt_blue', 'shirt_red', 'shirt_green'];
import { clamp, lerp } from './Engine.js';

const hex = (c) => '#' + (c >>> 0).toString(16).padStart(6, '0');
function shadeC(c, f) {
  const r = clamp((((c >> 16) & 255) * f) | 0, 0, 255);
  const g = clamp((((c >> 8) & 255) * f) | 0, 0, 255);
  const b = clamp(((c & 255) * f) | 0, 0, 255);
  return (r << 16) | (g << 8) | b;
}
const c3 = (c) => new Color3(((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255);

function flatMat(scene, color) {
  const m = new StandardMaterial('am' + color + Math.random(), scene);
  m.diffuseColor = c3(color);
  m.specularColor = new Color3(0.03, 0.03, 0.03);
  return m;
}

function texMat(scene, w, h, draw) {
  const tex = new DynamicTexture('at' + Math.random(), { width: w, height: h }, scene, true);
  draw(tex.getContext());
  tex.update(false);
  const m = new StandardMaterial('atm' + Math.random(), scene);
  m.diffuseTexture = tex;
  m.specularColor = new Color3(0.03, 0.03, 0.03);
  return m;
}

// ---------- textures ----------
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
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = hex(shadeC(pants, 0.55));
  ctx.fillRect(0, 0, 2, 64); ctx.fillRect(62, 0, 2, 64);
  ctx.globalAlpha = 1;
}

// face decal drawn on a transparent plane mounted on the front of the head —
// no cylinder UV guesswork, always faces the same way as the torso front.
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

// ---------- hair: thin shells hugging the cylinder ----------
const HEAD_R = 0.4;
export const HAIR_STYLES = ['bacon', 'swoosh', 'spiky', 'bob', 'cap'];

function buildHair(scene, parent, style, color) {
  const m1 = flatMat(scene, color);
  const m2 = flatMat(scene, shadeC(color, 1.32));
  m1.backFaceCulling = false;
  m2.backFaceCulling = false;
  const g = new TransformNode('hair', scene);
  g.parent = parent;
  const made = [];

  const cap = (h = 0.06, r = HEAD_R + 0.015, m = m1) => {
    const c = MeshBuilder.CreateCylinder('hcap', { diameter: r * 2, height: h, tessellation: 24 }, scene);
    c.material = m;
    c.parent = g;
    c.position.y = 0.3 + h / 2;
    made.push(c);
    return c;
  };
  // curved shell approximated by small angled boxes hugging the head.
  // centerDeg 0 = face direction (+z local), positive = clockwise viewed from above.
  // Fully deterministic — no engine arc-orientation guesswork.
  const shell = (centerDeg, widthDeg, top, bottom, m = m1, rOff = 0.045) => {
    const r = HEAD_R + rOff;
    const h = top - bottom;
    const segAngle = 18; // degrees per box segment
    const n = Math.max(1, Math.round(widthDeg / segAngle));
    const segW = 2 * r * Math.tan((widthDeg / n) * Math.PI / 360) + 0.015;
    for (let i = 0; i < n; i++) {
      const aDeg = centerDeg - widthDeg / 2 + (i + 0.5) * (widthDeg / n);
      const a = aDeg * Math.PI / 180;
      const b = MeshBuilder.CreateBox('hs', { width: segW, height: h, depth: 0.06 }, scene);
      b.material = m;
      b.parent = g;
      b.position.set(Math.sin(a) * r, bottom + h / 2, Math.cos(a) * r);
      b.rotation.y = a;
      made.push(b);
    }
  };
  const cone = (r, h, x, y, z, rx = 0, rz = 0, m = m1) => {
    const c = MeshBuilder.CreateCylinder('hc', { diameterTop: 0, diameterBottom: r * 2, height: h, tessellation: 8 }, scene);
    c.material = m;
    c.parent = g;
    c.position.set(x, y, z);
    c.rotation.x = rx; c.rotation.z = rz;
    made.push(c);
    return c;
  };

  switch (style) {
    case 'bacon':
      cap(0.07);
      shell(0, 40, 0.30, 0.16, m1);
      shell(-32, 22, 0.30, 0.20, m2);
      shell(32, 22, 0.30, 0.18, m1);
      shell(90, 50, 0.30, 0.08, m2);
      shell(-90, 50, 0.30, 0.10, m1);
      shell(180, 90, 0.30, 0.02, m1);
      break;
    case 'swoosh':
      cap(0.07);
      shell(-16, 56, 0.30, 0.14, m1);
      shell(26, 24, 0.30, 0.20, m2);
      shell(112, 62, 0.30, 0.06, m1);
      shell(-112, 62, 0.30, 0.06, m2);
      cone(0.07, 0.2, -0.2, 0.4, 0.26, 1.1, 0.55, m2);
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
    case 'bob':
      cap(0.08);
      shell(0, 60, 0.30, 0.14, m1);
      shell(90, 52, 0.30, -0.22, m1);
      shell(-90, 52, 0.30, -0.22, m1);
      shell(180, 105, 0.30, -0.26, m2);
      break;
    case 'cap': {
      cap(0.09, HEAD_R + 0.03, m1);
      shell(180, 190, 0.30, 0.14, m1, 0.035);
      const brim = MeshBuilder.CreateBox('brim', { width: 0.42, height: 0.04, depth: 0.24 }, scene);
      brim.material = m1;
      brim.parent = g;
      brim.position.set(0, 0.31, HEAD_R + 0.1);
      made.push(brim);
      const btn = MeshBuilder.CreateSphere('btn', { diameter: 0.08, segments: 6 }, scene);
      btn.material = m2;
      btn.parent = g;
      btn.position.y = 0.41;
      made.push(btn);
      shell(115, 34, 0.14, 0.02, m2);
      shell(-115, 34, 0.14, 0.02, m2);
      break;
    }
  }
  return g;
}

export class Avatar {
  constructor(engine, look = {}) {
    const scene = engine.scene;
    this.scene = scene;
    const skin = look.skin ?? 0xf3f3f3;
    const shirt = look.shirt ?? 0x1f7fd1;
    const jacket = look.jacket ?? 0x17181a;
    const pants = look.pants ?? 0x2a332a;
    const hairC = look.hair ?? 0x7a4a21;
    const style = look.style || 'bacon';

    const mSkin = flatMat(scene, skin);
    const mJacket = flatMat(scene, jacket);
    const mDenim = texMat(scene, 64, 64, (ctx) => drawDenim(ctx, pants));
    const mShoe = flatMat(scene, 0xf5f5f5);
    const mSole = flatMat(scene, 0x22252a);

    const root = new TransformNode('avatar', scene);
    this.group = root;
    this.meshes = [];

    const reg = (m) => { this.meshes.push(m); return m; };

    // ---- torso: multi-material box via faceUV on a textured atlas
    // simpler: one box with torso texture on front/back, jacket color sides
    const torsoTex = new DynamicTexture('torso', { width: 128, height: 128 }, scene, true);
    drawTorso(torsoTex.getContext(), jacket, shirt, true);
    torsoTex.update(false);
    const mTorso = new StandardMaterial('mtorso', scene);
    mTorso.diffuseTexture = torsoTex;
    mTorso.specularColor = new Color3(0.03, 0.03, 0.03);
    // faceUV: front face gets full texture; others get the jacket-colored edge strip
    const edge = [0, 0, 0.05, 1]; // a strip of jacket color at texture left
    const full = [0, 0, 1, 1];
    // Babylon box faces: 0=front(+z), 1=back(-z), 2/3=sides, 4=top, 5=bottom
    const torso = reg(MeshBuilder.CreateBox('torso', {
      width: 1.0, height: 1.0, depth: 0.5,
      faceUV: [
        full,          // front (+z) — shirt with graphic
        full,          // back
        edge, edge, edge, edge
      ].map((a) => ({ x: a[0], y: a[1], z: a[2], w: a[3] }))
    }, scene));
    const clothesId = CLOTHES[look.clothes | 0] || null;
    if (clothesId) {
      const cm = new StandardMaterial('mclothes' + Math.random(), scene);
      cm.diffuseTexture = new Texture('assets/clothes/' + clothesId + '.jpg', scene);
      cm.specularColor = new Color3(0.03, 0.03, 0.03);
      torso.material = cm;
    } else {
      torso.material = mTorso;
    }
    torso.parent = root;
    torso.position.y = 1.5;

    // ---- head: clean plain-skin cylinder with a flat top
    const neck = new TransformNode('neck', scene);
    neck.parent = root;
    neck.position.y = 2.0;
    const head = reg(MeshBuilder.CreateCylinder('head', {
      diameter: 0.8, height: 0.6, tessellation: 28
    }, scene));
    head.material = mSkin;
    head.parent = neck;
    head.position.y = 0.32;
    this.headNode = head;

    // ---- face decal: transparent plane curved onto the front of the cylinder
    const faceTex = new DynamicTexture('face', { width: 256, height: 256 }, scene, true);
    drawFace(faceTex.getContext());
    faceTex.update(false);
    faceTex.hasAlpha = true;
    const mFace = new StandardMaterial('mface', scene);
    mFace.diffuseTexture = faceTex;
    mFace.useAlphaFromDiffuseTexture = true;
    mFace.specularColor = new Color3(0, 0, 0);
    mFace.backFaceCulling = false;
    const face = MeshBuilder.CreatePlane('facep', {
      width: 0.62, height: 0.58, sideOrientation: Mesh.DOUBLESIDE
    }, scene);
    face.material = mFace;
    face.parent = neck;
    // flat decal floating just in front of the cylinder — classic face look
    face.position.set(0, 0.32, HEAD_R + 0.012);
    this.faceMesh = face;

    // ---- hair
    const hairMount = new TransformNode('hairmount', scene);
    hairMount.parent = neck;
    hairMount.position.y = 0.32;
    buildHair(scene, hairMount, style, hairC);
    hairMount.getChildMeshes().forEach((m) => this.meshes.push(m));

    // ---- arms: full R6 blocks
    const makeArm = (side) => {
      const sh = new TransformNode('sh', scene);
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
      return { sh };
    };

    // ---- legs: full R6 blocks + sneakers
    const makeLeg = (side) => {
      const hip = new TransformNode('hip', scene);
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
      return { hip };
    };

    this.neck = neck;
    this.la = makeArm(-1); this.ra = makeArm(1);
    this.ll = makeLeg(-1); this.rl = makeLeg(1);
    this.la.sh.rotation.z = 0.06;
    this.ra.sh.rotation.z = -0.06;
    this.phase = Math.random() * 6.28;
    this._lean = 0;

    // shadows
    for (const m of this.meshes) engine.addShadows(m);
  }

  setNameTag(name) {
    const scene = this.scene;
    const tex = new DynamicTexture('tag', { width: 512, height: 128 }, scene, true);
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, 512, 128);
    ctx.font = 'bold 56px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    const w = Math.min(ctx.measureText(name).width + 44, 500);
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect((512 - w) / 2, 20, w, 88, 18); ctx.fill(); }
    else ctx.fillRect((512 - w) / 2, 20, w, 88);
    ctx.fillStyle = '#fff';
    ctx.fillText(name, 256, 66);
    tex.update(false);
    tex.hasAlpha = true;

    const plane = MeshBuilder.CreatePlane('tagp', { width: 3.2, height: 0.8, sideOrientation: Mesh.DOUBLESIDE }, scene);
    const m = new StandardMaterial('tagm', scene);
    m.diffuseTexture = tex;
    m.emissiveColor = new Color3(1, 1, 1);
    m.disableLighting = true;
    m.useAlphaFromDiffuseTexture = true;
    m.backFaceCulling = false;
    plane.material = m;
    plane.parent = this.group;
    plane.position.y = 3.35;
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
    plane.applyFog = false;
    return this;
  }

  // speed-aware animation: idle sway -> walk -> RUN
  animate(dt, speed, grounded) {
    const running = speed > 11;
    this.phase += dt * (3 + speed * (running ? 1.6 : 2.0));
    const { la, ra, ll, rl } = this;
    const s = Math.sin(this.phase);
    const targetLean = grounded ? clamp(speed * 0.014, 0, 0.38) : 0.1;
    this._lean = lerp(this._lean, targetLean, dt * 6);
    this.neck.rotation.x = this._lean * 0.5;

    if (!grounded) {
      la.sh.rotation.x = lerp(la.sh.rotation.x, -2.7, dt * 10);
      ra.sh.rotation.x = lerp(ra.sh.rotation.x, -2.7, dt * 10);
      ll.hip.rotation.x = lerp(ll.hip.rotation.x, 0.45, dt * 10);
      rl.hip.rotation.x = lerp(rl.hip.rotation.x, -0.3, dt * 10);
    } else if (running) {
      const amp = clamp(speed * 0.075, 0.9, 1.5);
      la.sh.rotation.x = s * amp;
      ra.sh.rotation.x = -s * amp;
      ll.hip.rotation.x = -s * amp;
      rl.hip.rotation.x = s * amp;
      la.sh.rotation.z = 0.12; ra.sh.rotation.z = -0.12;
    } else if (speed > 0.5) {
      const amp = clamp(speed * 0.09, 0, 0.85);
      la.sh.rotation.x = s * amp;
      ra.sh.rotation.x = -s * amp;
      ll.hip.rotation.x = -s * amp;
      rl.hip.rotation.x = s * amp;
      la.sh.rotation.z = lerp(la.sh.rotation.z, 0.06, dt * 8);
      ra.sh.rotation.z = lerp(ra.sh.rotation.z, -0.06, dt * 8);
    } else {
      const t = this.phase * 0.35;
      la.sh.rotation.x = lerp(la.sh.rotation.x, Math.sin(t) * 0.05, dt * 4);
      ra.sh.rotation.x = lerp(ra.sh.rotation.x, -Math.sin(t) * 0.05, dt * 4);
      ll.hip.rotation.x = lerp(ll.hip.rotation.x, 0, dt * 6);
      rl.hip.rotation.x = lerp(rl.hip.rotation.x, 0, dt * 6);
      la.sh.rotation.z = lerp(la.sh.rotation.z, 0.06, dt * 4);
      ra.sh.rotation.z = lerp(ra.sh.rotation.z, -0.06, dt * 4);
    }
  }

  dispose() {
    this.group.dispose(false, true);
  }
}
