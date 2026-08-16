// BloxWorlds Engine — Effects: particles, checkpoint beams, spawn pads.
import * as THREE from 'three';

export class Effects {
  constructor(engine) {
    this.engine = engine;
    this.bursts = [];
    engine.addSystem((dt) => this._update(dt));
  }

  // blocky particle burst (death, win confetti, etc.)
  burst(pos, color = 0xffffff, count = 18, speed = 9) {
    const geo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    const mat = new THREE.MeshBasicMaterial({ color });
    const parts = [];
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos);
      const a = Math.random() * Math.PI * 2;
      const up = Math.random() * 0.9 + 0.35;
      m.userData.v = new THREE.Vector3(
        Math.cos(a) * speed * (0.4 + Math.random() * 0.6),
        up * speed,
        Math.sin(a) * speed * (0.4 + Math.random() * 0.6)
      );
      m.userData.spin = new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8);
      this.engine.scene.add(m);
      parts.push(m);
    }
    this.bursts.push({ parts, t: 0, life: 1.15 });
  }

  confetti(pos) {
    for (const c of [0xff5252, 0xffd740, 0x69f0ae, 0x40c4ff, 0xe040fb]) {
      this.burst(pos, c, 8, 11);
    }
  }

  // vertical light beam (checkpoints / win pad) — Roblox-y glow pillar
  beam(x, y, z, color = 0xffee58, height = 9, radius = 0.55) {
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide
    });
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.25, height, 14, 1, true), mat);
    cyl.position.set(x, y + height / 2, z);
    this.engine.scene.add(cyl);
    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.5, radius * 0.6, height, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false })
    );
    inner.position.copy(cyl.position);
    this.engine.scene.add(inner);
    this.engine.addSystem((dt, now) => {
      const s = 1 + Math.sin(now / 400) * 0.07;
      cyl.scale.set(s, 1, s);
    });
    return cyl;
  }

  // glowing spawn pad ring
  spawnRing(x, y, z, color = 0x69f0ae, r = 2.2) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.12, 10, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y + 0.08, z);
    this.engine.scene.add(ring);
    this.engine.addSystem((dt, now) => {
      ring.material.opacity = 0.55 + Math.sin(now / 350) * 0.3;
    });
    return ring;
  }

  _update(dt) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.t += dt;
      const k = 1 - b.t / b.life;
      for (const m of b.parts) {
        m.userData.v.y -= 26 * dt;
        m.position.addScaledVector(m.userData.v, dt);
        m.rotation.x += m.userData.spin.x * dt;
        m.rotation.y += m.userData.spin.y * dt;
        m.scale.setScalar(Math.max(k, 0.001));
      }
      if (b.t >= b.life) {
        for (const m of b.parts) this.engine.scene.remove(m);
        this.bursts.splice(i, 1);
      }
    }
  }
}
