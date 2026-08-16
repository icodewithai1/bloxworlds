// BloxWorlds Engine — World: parts, materials, textures, collision queries
import * as THREE from 'three';

// procedural surface textures so bricks aren't flat colors
function makeTexture(kind, colorHex) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const ctx = cv.getContext('2d');
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
    // classic brick studs
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
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export class World {
  constructor(engine) {
    this.engine = engine;
    this.parts = [];
    this.checkpoints = [];
    this.spawn = new THREE.Vector3(0, 3, 0);
    this._mats = new Map();
  }

  material(color, tex) {
    const key = color + ':' + (tex || '');
    if (!this._mats.has(key)) {
      const opts = { color, roughness: 0.8 };
      if (tex) {
        opts.map = makeTexture(tex, color);
        opts.color = 0xffffff;
        if (tex === 'lava') { opts.emissive = new THREE.Color(0x992200); opts.emissiveIntensity = 0.55; }
      }
      this._mats.set(key, new THREE.MeshStandardMaterial(opts));
    }
    return this._mats.get(key);
  }

  // A Part is the basic building block (like a brick).
  addPart({ x, y, z, w, h, d, color = 0xcccccc, kind = 'solid', extra = null, tex = null }) {
    // default textures by kind
    if (tex === null) {
      if (kind === 'kill') tex = 'lava';
      else if (w >= 10 && d >= 10) tex = 'stud';
    }
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.material(color, tex));
    if (tex) {
      // scale texture repeat with part size
      const m = mesh.material.map;
      if (m && (w > 6 || d > 6)) { /* single material shared; repeat kept 1 for simplicity */ }
    }
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    this.engine.scene.add(mesh);
    const part = {
      mesh, kind, extra,
      half: new THREE.Vector3(w / 2, h / 2, d / 2),
      base: new THREE.Vector3(x, y, z),
      delta: 0
    };
    this.parts.push(part);
    if (kind === 'checkpoint') this.checkpoints.push(part);
    return part;
  }

  addModel(mesh, position) {
    mesh.position.copy(position);
    mesh.castShadow = true;
    this.engine.scene.add(mesh);
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
