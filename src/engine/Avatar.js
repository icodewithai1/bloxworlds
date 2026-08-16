// BloxWorlds Engine — Avatar model: R15-inspired 15-part blocky character
import * as THREE from 'three';
import { clamp, lerp } from './Engine.js';

export class Avatar {
  constructor(look = {}) {
    const body = look.body ?? 0x0b5bd3;
    const skin = look.skin ?? 0xf5c542;
    const pants = look.pants ?? 0x2e7d32;

    const mSkin = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.65 });
    const mBody = new THREE.MeshStandardMaterial({ color: body, roughness: 0.65 });
    const mPant = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.65 });

    const part = (w, h, d, mat) => {
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

    // R15 parts: LowerTorso, UpperTorso
    const lowerTorso = part(0.9, 0.35, 0.5, mBody); lowerTorso.position.y = 1.05; root.add(lowerTorso);
    const upperTorso = part(1.0, 0.75, 0.5, mBody); upperTorso.position.y = 1.62; root.add(upperTorso);

    // Head + classic face
    const head = part(0.65, 0.65, 0.65, mSkin);
    head.position.y = 2.35;
    root.add(head);
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(40, 48, 9, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(88, 48, 9, 0, 7); ctx.fill();
    ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(64, 62, 26, 0.35, Math.PI - 0.35); ctx.stroke();
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.6),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true })
    );
    face.position.set(0, 0, 0.331);
    head.add(face);

    // Arms: UpperArm, LowerArm, Hand (shoulder + elbow joints)
    const makeArm = (side) => {
      const sh = pivot(side * 0.66, 1.95, 0);
      const upper = part(0.3, 0.55, 0.3, mBody); upper.position.y = -0.27; sh.add(upper);
      const el = pivot(0, -0.55, 0); sh.add(el);
      const lower = part(0.28, 0.45, 0.28, mSkin); lower.position.y = -0.22; el.add(lower);
      const hand = part(0.26, 0.2, 0.26, mSkin); hand.position.y = -0.55; el.add(hand);
      root.add(sh);
      return { sh, el };
    };
    // Legs: UpperLeg, LowerLeg, Foot (hip + knee joints)
    const makeLeg = (side) => {
      const hip = pivot(side * 0.25, 1.15, 0);
      const upper = part(0.36, 0.55, 0.4, mPant); upper.position.y = -0.28; hip.add(upper);
      const knee = pivot(0, -0.56, 0); hip.add(knee);
      const lower = part(0.34, 0.42, 0.38, mPant); lower.position.y = -0.2; knee.add(lower);
      const foot = part(0.36, 0.18, 0.5, mSkin); foot.position.set(0, -0.5, 0.05); knee.add(foot);
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
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false }));
    sp.scale.set(3.2, 0.8, 1);
    sp.position.y = 3.15;
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
