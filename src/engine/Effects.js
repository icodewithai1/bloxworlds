// BloxWorlds Engine — Effects: particles, checkpoint beams, spawn pads (Babylon.js)
import { MeshBuilder, StandardMaterial, Color3, Mesh, Vector3 } from 'babylon';

const c3 = (c) => new Color3(((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255);

function glowMat(scene, color, alpha = 1) {
  const m = new StandardMaterial('fx' + Math.random(), scene);
  m.emissiveColor = c3(color);
  m.diffuseColor = new Color3(0, 0, 0);
  m.specularColor = new Color3(0, 0, 0);
  m.disableLighting = true;
  if (alpha < 1) m.alpha = alpha;
  return m;
}

export class Effects {
  constructor(engine) {
    this.engine = engine;
    this.bursts = [];
    engine.addSystem((dt) => this._update(dt));
  }

  burst(pos, color = 0xffffff, count = 18, speed = 9) {
    const scene = this.engine.scene;
    const mat = glowMat(scene, color);
    const parts = [];
    for (let i = 0; i < count; i++) {
      const m = MeshBuilder.CreateBox('fxp', { size: 0.22 }, scene);
      m.material = mat;
      m.position.copyFrom(pos);
      const a = Math.random() * Math.PI * 2;
      const up = Math.random() * 0.9 + 0.35;
      m.metadata = {
        v: new Vector3(
          Math.cos(a) * speed * (0.4 + Math.random() * 0.6),
          up * speed,
          Math.sin(a) * speed * (0.4 + Math.random() * 0.6)
        ),
        spin: new Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8)
      };
      parts.push(m);
    }
    this.bursts.push({ parts, t: 0, life: 1.15 });
  }

  confetti(pos) {
    for (const c of [0xff5252, 0xffd740, 0x69f0ae, 0x40c4ff, 0xe040fb]) {
      this.burst(pos, c, 8, 11);
    }
  }

  beam(x, y, z, color = 0xffee58, height = 9, radius = 0.55) {
    const scene = this.engine.scene;
    const cyl = MeshBuilder.CreateCylinder('beam', {
      diameterTop: radius * 2, diameterBottom: radius * 2.5, height, tessellation: 14, cap: Mesh.NO_CAP
    }, scene);
    cyl.material = glowMat(scene, color, 0.32);
    cyl.material.backFaceCulling = false;
    cyl.position.set(x, y + height / 2, z);
    cyl.isPickable = false;
    const inner = MeshBuilder.CreateCylinder('beami', {
      diameterTop: radius, diameterBottom: radius * 1.2, height, tessellation: 10, cap: Mesh.NO_CAP
    }, scene);
    inner.material = glowMat(scene, 0xffffff, 0.18);
    inner.material.backFaceCulling = false;
    inner.position.copyFrom(cyl.position);
    inner.isPickable = false;
    this.engine.addSystem((dt, now) => {
      const s = 1 + Math.sin(now / 400) * 0.07;
      cyl.scaling.set(s, 1, s);
    });
    return cyl;
  }

  spawnRing(x, y, z, color = 0x69f0ae, r = 2.2) {
    const scene = this.engine.scene;
    const ring = MeshBuilder.CreateTorus('ring', { diameter: r * 2, thickness: 0.24, tessellation: 32 }, scene);
    const mat = glowMat(scene, color, 0.85);
    ring.material = mat;
    ring.position.set(x, y + 0.08, z);
    ring.isPickable = false;
    this.engine.addSystem((dt, now) => {
      mat.alpha = 0.55 + Math.sin(now / 350) * 0.3;
    });
    return ring;
  }

  _update(dt) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.t += dt;
      const k = Math.max(1 - b.t / b.life, 0.001);
      for (const m of b.parts) {
        m.metadata.v.y -= 26 * dt;
        m.position.addInPlace(m.metadata.v.scale(dt));
        m.rotation.x += m.metadata.spin.x * dt;
        m.rotation.y += m.metadata.spin.y * dt;
        m.scaling.setAll(k);
      }
      if (b.t >= b.life) {
        for (const m of b.parts) m.dispose();
        this.bursts.splice(i, 1);
      }
    }
  }
}
