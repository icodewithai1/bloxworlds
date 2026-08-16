// BloxWorlds Engine — World: parts, materials, textures, collision data (Babylon.js)
import {
  MeshBuilder, StandardMaterial, DynamicTexture, Texture, Color3, Vector3
} from './blox3d.js';

// real 2D texture images shipped in assets/textures/
const IMAGE_TEX = {
  stud: 'assets/textures/stud.jpg',
  grass: 'assets/textures/grass.jpg',
  sand: 'assets/textures/sand.jpg',
  water: 'assets/textures/water.jpg',
  lava: 'assets/textures/lava.jpg'
};

function hexToC3(c) {
  return new Color3(((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255);
}

// procedural surface textures so bricks aren't flat colors
function makeTexture(scene, kind, colorHex) {
  const tex = new DynamicTexture('t' + kind + colorHex, { width: 64, height: 64 }, scene, true);
  const ctx = tex.getContext();
  const c = '#' + (colorHex >>> 0).toString(16).padStart(6, '0');
  ctx.fillStyle = c;
  ctx.fillRect(0, 0, 64, 64);
  const shade = (f) => {
    const r = Math.min(255, (((colorHex >> 16) & 255) * f) | 0);
    const g = Math.min(255, (((colorHex >> 8) & 255) * f) | 0);
    const b = Math.min(255, ((colorHex & 255) * f) | 0);
    return `rgb(${r},${g},${b})`;
  };
  if (kind === 'grass') {
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = shade(Math.random() < 0.5 ? 0.82 : 1.2);
      ctx.globalAlpha = 0.3;
      ctx.fillRect((Math.random() * 64) | 0, (Math.random() * 64) | 0, 1, 2);
    }
  } else if (kind === 'stud') {
    ctx.globalAlpha = 0.28;
    for (let y = 8; y < 64; y += 16) {
      for (let x = 8; x < 64; x += 16) {
        ctx.fillStyle = shade(1.35);
        ctx.beginPath(); ctx.arc(x, y - 1, 4.2, 0, 7); ctx.fill();
        ctx.fillStyle = shade(0.6);
        ctx.beginPath(); ctx.arc(x, y + 1.5, 4.2, 0, 7); ctx.fill();
        ctx.fillStyle = shade(1.12);
        ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
      }
    }
  } else if (kind === 'lava') {
    for (let i = 0; i < 42; i++) {
      ctx.fillStyle = i % 2 ? '#ffd54a' : '#ff7b1c';
      ctx.globalAlpha = 0.5;
      const x = Math.random() * 64, y = Math.random() * 64;
      ctx.beginPath(); ctx.arc(x, y, 2 + Math.random() * 5, 0, 7); ctx.fill();
    }
  } else if (kind === 'noise') {
    for (let i = 0; i < 350; i++) {
      ctx.fillStyle = shade(Math.random() < 0.5 ? 0.88 : 1.15);
      ctx.globalAlpha = 0.25;
      ctx.fillRect((Math.random() * 64) | 0, (Math.random() * 64) | 0, 2, 2);
    }
  }
  ctx.globalAlpha = 1;
  tex.update(false);
  return tex;
}

export class World {
  constructor(engine) {
    this.engine = engine;
    this.parts = [];
    this.checkpoints = [];
    this.spawn = new Vector3(0, 3, 0);
    this._mats = new Map();
  }

  material(color, tex, uv = 1) {
    const key = color + ':' + (tex || '') + ':' + uv;
    if (!this._mats.has(key)) {
      const m = new StandardMaterial('m' + key, this.engine.scene);
      m.specularColor = new Color3(0.04, 0.04, 0.04);
      if (tex && IMAGE_TEX[tex]) {
        const t = new Texture(IMAGE_TEX[tex], this.engine.scene);
        t.uScale = uv; t.vScale = uv;
        m.diffuseTexture = t;
        const c = hexToC3(color);
        m.diffuseColor = tex === 'stud' ? c : new Color3(1, 1, 1);
        if (tex === 'lava') m.emissiveColor = new Color3(0.5, 0.16, 0.03);
        if (tex === 'water') m.alpha = 0.8;
      } else if (tex) {
        m.diffuseTexture = makeTexture(this.engine.scene, tex, color);
      } else {
        m.diffuseColor = hexToC3(color);
      }
      this._mats.set(key, m);
    }
    return this._mats.get(key);
  }

  // A Part is the basic building block (like a brick).
  addPart({ x, y, z, w, h, d, color = 0xcccccc, kind = 'solid', extra = null, tex = null }) {
    if (tex === null) {
      if (kind === 'kill') tex = 'lava';
      else if (w >= 10 && d >= 10) tex = 'stud';
    }
    const uv = tex ? Math.max(1, Math.round(Math.max(w, d) / 4)) : 1;
    const mesh = MeshBuilder.CreateBox('p' + this.parts.length, { width: w, height: h, depth: d }, this.engine.scene);
    mesh.material = this.material(color, tex, uv);
    mesh.position.set(x, y, z);
    this.engine.addShadows(mesh);
    const part = {
      mesh, kind, extra,
      half: new Vector3(w / 2, h / 2, d / 2),
      base: new Vector3(x, y, z),
      delta: 0
    };
    this.parts.push(part);
    if (kind === 'checkpoint') this.checkpoints.push(part);
    return part;
  }

  addModel(mesh, position) {
    mesh.position.copyFrom(position);
    this.engine.addShadows(mesh);
    return mesh;
  }

  // animate movers/spinners
  update(time) {
    for (const p of this.parts) {
      if (p.kind === 'mover') {
        const prev = p.mesh.position.x;
        p.mesh.position.x = p.base.x + Math.sin(time * p.extra.speed + p.extra.off) * p.extra.amp;
        p.delta = p.mesh.position.x - prev;
      } else if (p.kind === 'spinner') {
        p.mesh.rotation.y = time * p.extra.speed;
      }
    }
  }
}
