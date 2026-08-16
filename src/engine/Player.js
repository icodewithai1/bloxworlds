// BloxWorlds Engine — Player: physics character controller (Babylon.js)
import { Vector3 } from 'babylon';
import { clamp, lerp, lerpAngle } from './Engine.js';
import { Avatar } from './Avatar.js';

const GRAV = 32, PR = 0.45, PH = 2.7;

export class Player {
  constructor(engine, world, { name, look, speed = 9.4, jumpPower = 13.5 }) {
    this.engine = engine;
    this.world = world;
    this.name = name;
    this.look = look;
    this.moveSpeed = speed;
    this.jumpPower = jumpPower;

    this.pos = world.spawn.clone();
    this.vel = new Vector3(0, 0, 0);
    this.yaw = 0;
    this.grounded = false;
    this.checkpoint = world.spawn.clone();
    this.stage = 0;
    this.deaths = 0;
    this.won = false;

    this.avatar = new Avatar(engine, look).setNameTag(name);

    this.onDeath = null;
    this.onCheckpoint = null;
    this.onWin = null;
    this.onJump = null;
    this.onLand = null;
    this.onTouchKind = null;
  }

  respawn(died) {
    if (died) {
      this.deaths++;
      this.onDeath && this.onDeath();
    }
    this.pos.copyFrom(this.checkpoint);
    this.vel.set(0, 0, 0);
  }

  get speed() { return Math.hypot(this.vel.x, this.vel.z); }

  update(dt, input) {
    const world = this.world;
    world.update(this.engine.time);

    this.vel.y = Math.max(this.vel.y - GRAV * dt, -55);

    const it = input.intent();
    let wx = 0, wz = 0;
    if (it.x !== 0 || it.z !== 0) {
      const ang = Math.atan2(it.x, it.z) + input.camYaw;
      const mag = Math.min(Math.hypot(it.x, it.z), 1);
      wx = Math.sin(ang) * this.moveSpeed * mag;
      wz = Math.cos(ang) * this.moveSpeed * mag;
      this.yaw = lerpAngle(this.yaw, Math.atan2(wx, wz), dt * 12);
    }
    this.vel.x = lerp(this.vel.x, wx, dt * (this.grounded ? 14 : 5));
    this.vel.z = lerp(this.vel.z, wz, dt * (this.grounded ? 14 : 5));

    if (input.jump && this.grounded) {
      this.vel.y = this.jumpPower;
      this.grounded = false;
      this.onJump && this.onJump();
    }

    const next = new Vector3(
      this.pos.x + this.vel.x * dt,
      this.pos.y + this.vel.y * dt,
      this.pos.z + this.vel.z * dt
    );
    let grounded = false;
    let riding = null;

    for (const q of world.parts) {
      if (q.kind === 'deco') continue;
      if (q.kind === 'spinner') { this._spinnerHit(q); continue; }
      const c = q.mesh.position;
      const hx = q.half.x + PR, hy = q.half.y, hz = q.half.z + PR;
      const dx = next.x - c.x, dz = next.z - c.z;
      if (Math.abs(dx) > hx || Math.abs(dz) > hz) continue;
      const footNow = this.pos.y, footNext = next.y;
      const top = c.y + hy, bottom = c.y - hy;

      if (footNow >= top - 0.12 && footNext <= top + 0.02 && this.vel.y <= 0) {
        next.y = top;
        this.vel.y = 0;
        grounded = true;
        if (q.kind === 'mover') riding = q;
        this._touched(q);
        continue;
      }
      if (footNow + PH <= bottom + 0.12 && footNext + PH >= bottom && this.vel.y > 0) {
        next.y = bottom - PH;
        this.vel.y = 0;
        continue;
      }
      if (footNext < top - 0.05 && footNext + PH > bottom + 0.05) {
        const ox = hx - Math.abs(dx), oz = hz - Math.abs(dz);
        if (ox < oz) { next.x = c.x + Math.sign(dx) * hx; this.vel.x = 0; }
        else { next.z = c.z + Math.sign(dz) * hz; this.vel.z = 0; }
        this._touched(q);
      }
    }

    if (riding) next.x += riding.delta;

    if (grounded && !this.grounded && this._fell > 0.15) this.onLand && this.onLand();
    this._fell = grounded ? 0 : (this._fell || 0) + dt;

    this.pos.copyFrom(next);
    this.grounded = grounded;

    if (this.pos.y < -25) this.respawn(true);

    // sync avatar
    this.avatar.group.position.copyFrom(this.pos);
    this.avatar.group.rotation.y = this.yaw;
    this.avatar.animate(dt, this.speed, this.grounded);
  }

  _spinnerHit(q) {
    const rel = this.pos.subtract(q.mesh.position);
    if (this.pos.y > q.mesh.position.y + 0.5 || this.pos.y + PH < q.mesh.position.y - 0.5) return;
    const a = -q.mesh.rotation.y;
    const lx = rel.x * Math.cos(a) - rel.z * Math.sin(a);
    const lz = rel.x * Math.sin(a) + rel.z * Math.cos(a);
    if (Math.abs(lx) < q.extra.len / 2 + PR && Math.abs(lz) < 0.45 + PR) this.respawn(true);
  }

  _touched(q) {
    if (q.kind === 'kill') { this.respawn(true); return; }
    if (q.kind === 'checkpoint') {
      const n = q.extra.n;
      if (n > this.stage) {
        this.stage = n;
        this.checkpoint.set(q.mesh.position.x, q.mesh.position.y + q.half.y + 0.1, q.mesh.position.z);
        this.onCheckpoint && this.onCheckpoint(n);
      }
    }
    if (q.kind === 'win' && !this.won) {
      this.won = true;
      this.onWin && this.onWin();
    }
    if (this.onTouchKind) this.onTouchKind(q);
  }

  updateCamera(input) {
    const cam = this.engine.camera;
    const cd = input.camDist, cp = input.camPitch, cy = input.camYaw;
    cam.position.set(
      this.pos.x + Math.sin(cy) * Math.cos(cp) * cd,
      this.pos.y + 1.8 + Math.sin(cp) * cd,
      this.pos.z + Math.cos(cy) * Math.cos(cp) * cd
    );
    cam.setTarget(new Vector3(this.pos.x, this.pos.y + 1.6, this.pos.z));
  }
}

// Remote player = avatar driven by network interpolation
export class RemotePlayer {
  constructor(engine, { name, look }) {
    this.engine = engine;
    this.name = name;
    this.avatar = new Avatar(engine, look || {}).setNameTag(name || 'Guest');
    this.target = { pos: new Vector3(0, 3, 0), yaw: 0, grounded: true, speed: 0 };
    this.stage = 0;
  }

  applyState(p, grounded, speed) {
    this.target.pos.set(p[0], p[1], p[2]);
    this.target.yaw = p[3];
    this.target.grounded = grounded;
    this.target.speed = speed;
  }

  update(dt) {
    const g = this.avatar.group;
    const k = Math.min(dt * 12, 1);
    g.position.set(
      lerp(g.position.x, this.target.pos.x, k),
      lerp(g.position.y, this.target.pos.y, k),
      lerp(g.position.z, this.target.pos.z, k)
    );
    g.rotation.y = lerpAngle(g.rotation.y, this.target.yaw, dt * 12);
    this.avatar.animate(dt, this.target.speed, this.target.grounded);
  }

  dispose() {
    this.avatar.dispose();
  }
}
