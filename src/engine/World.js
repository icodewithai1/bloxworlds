// BloxWorlds Engine — World: parts, materials, collision queries
import * as THREE from 'three';

export class World {
  constructor(engine) {
    this.engine = engine;
    this.parts = [];
    this.checkpoints = [];
    this.spawn = new THREE.Vector3(0, 3, 0);
    this._mats = new Map();
  }

  material(color) {
    if (!this._mats.has(color)) {
      this._mats.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
    }
    return this._mats.get(color);
  }

  // A Part is the basic building block (like a brick).
  addPart({ x, y, z, w, h, d, color = 0xcccccc, kind = 'solid', extra = null }) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.material(color));
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
