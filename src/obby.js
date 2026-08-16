/* BloxWorlds - Mega Obby
 * Three.js game with R15-inspired blocky avatars and WebSocket multiplayer.
 */
import * as THREE from 'three';

// ---------------------------------------------------------------- utils
var clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
var lerp = function (a, b, t) { return a + (b - a) * t; };

function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// ---------------------------------------------------------------- basic scene
var canvas = document.getElementById('c');
var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

var scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 120, 420);

var camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

var sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(60, 120, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -120;
sun.shadow.camera.right = 120;
sun.shadow.camera.top = 120;
sun.shadow.camera.bottom = -120;
sun.shadow.camera.far = 400;
scene.add(sun);
scene.add(new THREE.AmbientLight(0xbfd9ff, 1.1));
var hemi = new THREE.HemisphereLight(0xcfe8ff, 0x6a8f5a, 0.6);
scene.add(hemi);

// clouds
(function () {
  var cg = new THREE.SphereGeometry(1, 8, 6);
  var cm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  for (var i = 0; i < 26; i++) {
    var cl = new THREE.Group();
    var n = 3 + ((Math.random() * 3) | 0);
    for (var j = 0; j < n; j++) {
      var s = new THREE.Mesh(cg, cm);
      s.position.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 5);
      var k = 2.5 + Math.random() * 3.5;
      s.scale.set(k * 1.6, k * 0.7, k);
      cl.add(s);
    }
    cl.position.set((Math.random() - 0.5) * 480, 55 + Math.random() * 60, (Math.random() - 0.5) * 480);
    scene.add(cl);
  }
})();

// ---------------------------------------------------------------- R15 avatar
// 15 parts: Head, UpperTorso, LowerTorso, L/R UpperArm, LowerArm, Hand, L/R UpperLeg, LowerLeg, Foot
var HEAD_Y = 0.86, HIPS_Y = 0;

function makeAvatar(opts) {
  opts = opts || {};
  var body = opts.body || 0x0b5bd3;
  var skin = opts.skin || 0xf5c542;
  var pants = opts.pants || 0x2e7d32;

  var mSkin = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.65 });
  var mBody = new THREE.MeshStandardMaterial({ color: body, roughness: 0.65 });
  var mPant = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.65 });

  function part(w, h, d, mat) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
  function pivot(x, y, z) {
    var g = new THREE.Group();
    g.position.set(x, y, z);
    return g;
  }

  var root = new THREE.Group();

  // torso
  var lowerTorso = part(0.9, 0.35, 0.5, mBody); lowerTorso.position.y = 1.05; root.add(lowerTorso);
  var upperTorso = part(1.0, 0.75, 0.5, mBody); upperTorso.position.y = 1.62; root.add(upperTorso);

  // head + face
  var head = part(0.65, 0.65, 0.65, mSkin);
  head.position.y = 2.35;
  root.add(head);
  var face = (function () {
    var cv = document.createElement('canvas');
    cv.width = 128; cv.height = 128;
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(40, 48, 9, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(88, 48, 9, 0, 7); ctx.fill();
    ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(64, 62, 26, 0.35, Math.PI - 0.35); ctx.stroke();
    var t = new THREE.CanvasTexture(cv);
    return new THREE.MeshBasicMaterial({ map: t, transparent: true });
  })();
  var facePlane = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), face);
  facePlane.position.set(0, 0, 0.331);
  head.add(facePlane);

  // arms: shoulder pivot -> upper arm -> elbow pivot -> lower arm + hand
  function makeArm(side) {
    var sh = pivot(side * 0.66, 1.95, 0);
    var upper = part(0.3, 0.55, 0.3, mBody); upper.position.y = -0.27; sh.add(upper);
    var el = pivot(0, -0.55, 0); sh.add(el);
    var lower = part(0.28, 0.45, 0.28, mSkin); lower.position.y = -0.22; el.add(lower);
    var hand = part(0.26, 0.2, 0.26, mSkin); hand.position.y = -0.55; el.add(hand);
    root.add(sh);
    return { sh: sh, el: el };
  }
  // legs: hip pivot -> upper leg -> knee pivot -> lower leg + foot
  function makeLeg(side) {
    var hip = pivot(side * 0.25, 1.15, 0);
    var upper = part(0.36, 0.55, 0.4, mPant); upper.position.y = -0.28; hip.add(upper);
    var knee = pivot(0, -0.56, 0); hip.add(knee);
    var lower = part(0.34, 0.42, 0.38, mPant); lower.position.y = -0.2; knee.add(lower);
    var foot = part(0.36, 0.18, 0.5, mSkin); foot.position.set(0, -0.5, 0.05); knee.add(foot);
    root.add(hip);
    return { hip: hip, knee: knee };
  }

  var la = makeArm(-1), ra = makeArm(1);
  var ll = makeLeg(-1), rl = makeLeg(1);

  return {
    group: root,
    head: head,
    la: la, ra: ra, ll: ll, rl: rl,
    phase: Math.random() * 6.28,
    animate: function (dt, speed, grounded) {
      this.phase += dt * (4 + speed * 2.2);
      var amp = grounded ? clamp(speed * 0.28, 0, 0.9) : 0.35;
      var s = Math.sin(this.phase);
      if (!grounded) {
        // jump pose
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
  };
}

function makeNameTag(name) {
  var cv = document.createElement('canvas');
  cv.width = 512; cv.height = 128;
  var ctx = cv.getContext('2d');
  ctx.font = 'bold 56px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  var w = ctx.measureText(name).width + 44;
  ctx.beginPath();
  ctx.roundRect((512 - w) / 2, 20, w, 88, 18);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(name, 256, 66);
  var tex = new THREE.CanvasTexture(cv);
  var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sp.scale.set(3.2, 0.8, 1);
  sp.position.y = 3.15;
  return sp;
}

// ---------------------------------------------------------------- obby map
var platforms = []; // {min:Vector3, max:Vector3, mesh, kind, idx}
var checkpoints = [];
var SPAWN = new THREE.Vector3(0, 3, 0);

var matCache = {};
function boxMat(color) {
  if (!matCache[color]) matCache[color] = new THREE.MeshStandardMaterial({ color: color, roughness: 0.8 });
  return matCache[color];
}

function addBox(x, y, z, w, h, d, color, kind, extra) {
  var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), boxMat(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  var p = {
    mesh: mesh, kind: kind || 'solid',
    half: new THREE.Vector3(w / 2, h / 2, d / 2),
    base: new THREE.Vector3(x, y, z),
    extra: extra || null
  };
  platforms.push(p);
  return p;
}

var RAINBOW = [0xe2231a, 0xff8f00, 0xfdd835, 0x43a047, 0x1e88e5, 0x8e24aa];

function buildMap() {
  // spawn island
  addBox(0, 0.5, 0, 22, 1, 22, 0x43a047, 'solid');
  addBox(0, 1.25, -8, 6, 0.5, 3, 0x8d6e63, 'solid');

  var x = 0, y = 1, z = -14, i;

  // section 1: rainbow hops
  for (i = 0; i < 7; i++) {
    z -= 5;
    y += 0.4;
    x = Math.sin(i * 1.1) * 4;
    addBox(x, y, z, 3.4, 1, 3.4, RAINBOW[i % 6], 'solid');
  }
  checkpoints.push(addBox(x, y + 0.75, z - 5, 4, 0.5, 4, 0xffee58, 'checkpoint', { n: 1 }));
  z -= 5;

  // section 2: kill bricks between safe pads
  for (i = 0; i < 6; i++) {
    z -= 4.5;
    var safe = (i % 2 === 0);
    addBox(0, y + 0.5, z, 3.2, 1, 3.2, safe ? 0x1e88e5 : 0xd32f2f, safe ? 'solid' : 'kill');
    if (!safe) addBox(6, y + 0.5, z, 3.2, 1, 3.2, 0x1e88e5, 'solid');
  }
  checkpoints.push(addBox(0, y + 1.25, z - 5, 4, 0.5, 4, 0xffee58, 'checkpoint', { n: 2 }));
  z -= 5;

  // section 3: moving platforms
  for (i = 0; i < 4; i++) {
    z -= 7;
    addBox(0, y + 1, z, 3, 0.8, 3, 0xff8f00, 'mover', {
      axis: 'x', amp: 5.5, speed: 0.9 + i * 0.25, off: i * 1.7
    });
  }
  checkpoints.push(addBox(0, y + 1.75, z - 6, 4, 0.5, 4, 0xffee58, 'checkpoint', { n: 3 }));
  z -= 6;

  // section 4: spinning bar island + thin bridge
  addBox(0, y + 1, z - 6, 12, 1, 12, 0x8e24aa, 'solid');
  addBox(0, y + 2.4, z - 6, 10, 0.6, 0.9, 0xd32f2f, 'spinner', { speed: 1.4 });
  z -= 15;
  for (i = 0; i < 5; i++) {
    addBox(0, y + 1, z - i * 3, 1.1, 0.6, 3, RAINBOW[(i + 2) % 6], 'solid');
  }
  z -= 15;
  checkpoints.push(addBox(0, y + 1.5, z + 1, 4, 0.5, 4, 0xffee58, 'checkpoint', { n: 4 }));

  // section 5: shrinking stair hops up to the win pad
  var yy = y + 1.5;
  for (i = 0; i < 6; i++) {
    z -= 4.2;
    yy += 1.1;
    var sz = 3.2 - i * 0.35;
    addBox(Math.sin(i * 2.1) * 3, yy, z, sz, 0.8, sz, RAINBOW[i % 6], 'solid');
  }
  z -= 6;
  // win island
  addBox(0, yy + 0.5, z - 4, 14, 1, 14, 0xffd700, 'win');
  var trophy = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 1.1, 2.4, 16),
    new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.25 })
  );
  trophy.position.set(0, yy + 2.3, z - 4);
  trophy.castShadow = true;
  scene.add(trophy);
}
buildMap();

// ---------------------------------------------------------------- player physics
var GRAV = 32, JUMP = 13.5, SPEED = 9.4, PR = 0.45, PH = 2.7; // player radius / height
var player = {
  pos: SPAWN.clone(),
  vel: new THREE.Vector3(),
  yaw: 0,
  grounded: false,
  checkpoint: SPAWN.clone(),
  stage: 0,
  deaths: 0,
  won: false,
  ridingDelta: new THREE.Vector3()
};

var myName = (localStorage.getItem('bw_name') || '').trim() || ('Guest' + ((Math.random() * 9000 + 1000) | 0));
function randColor(arr) { return arr[(Math.random() * arr.length) | 0]; }
var myLook = {
  body: randColor([0x0b5bd3, 0xd32f2f, 0x00897b, 0xf9a825, 0x6a1b9a, 0x37474f]),
  pants: randColor([0x2e7d32, 0x283593, 0x4e342e, 0x37474f, 0xad1457]),
  skin: 0xf5c542
};
var myAvatar = makeAvatar(myLook);
myAvatar.group.add(makeNameTag(myName));
scene.add(myAvatar.group);

// input
var keys = {};
var chatOpen = false;
window.addEventListener('keydown', function (e) {
  if (chatOpen) return;
  keys[e.code] = true;
  if (e.code === 'Space') e.preventDefault();
  if (e.code === 'Slash' || e.code === 'Enter') { openChat(); e.preventDefault(); }
  if (e.code === 'KeyR') respawn(false);
});
window.addEventListener('keyup', function (e) { keys[e.code] = false; });

// mouse camera
var camYaw = 0, camPitch = 0.32, camDist = 9;
var dragging = false, px = 0, py = 0;
canvas.addEventListener('mousedown', function (e) { dragging = true; px = e.clientX; py = e.clientY; });
window.addEventListener('mouseup', function () { dragging = false; });
window.addEventListener('mousemove', function (e) {
  if (!dragging) return;
  camYaw -= (e.clientX - px) * 0.0045;
  camPitch = clamp(camPitch + (e.clientY - py) * 0.0045, -0.2, 1.25);
  px = e.clientX; py = e.clientY;
});
window.addEventListener('wheel', function (e) {
  camDist = clamp(camDist + Math.sign(e.deltaY) * 1.2, 4, 18);
});

var msgEl = document.getElementById('msg');
var msgTimer = null;
function flash(text, color) {
  msgEl.textContent = text;
  msgEl.style.color = color || '#ffd54f';
  msgEl.style.opacity = 1;
  if (msgTimer) clearTimeout(msgTimer);
  msgTimer = setTimeout(function () { msgEl.style.opacity = 0; }, 1600);
}

function respawn(died) {
  if (died) {
    player.deaths++;
    flash('You died!', '#ff5252');
    netSend({ t: 'chatSys', m: 'died' });
  }
  player.pos.copy(player.checkpoint);
  player.vel.set(0, 0, 0);
}

function collideAndMove(dt) {
  // move platforms first
  var time = perf();
  for (var i = 0; i < platforms.length; i++) {
    var p = platforms[i];
    if (p.kind === 'mover') {
      var prev = p.mesh.position.x;
      p.mesh.position.x = p.base.x + Math.sin(time * p.extra.speed + p.extra.off) * p.extra.amp;
      p.delta = p.mesh.position.x - prev;
    } else if (p.kind === 'spinner') {
      p.mesh.rotation.y = time * p.extra.speed;
    }
  }

  player.vel.y -= GRAV * dt;
  player.vel.y = Math.max(player.vel.y, -55);

  // horizontal intent
  var ix = 0, iz = 0;
  if (keys.KeyW || keys.ArrowUp) iz -= 1;
  if (keys.KeyS || keys.ArrowDown) iz += 1;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1;
  if (keys.KeyD || keys.ArrowRight) ix += 1;
  var moving = (ix !== 0 || iz !== 0);
  var wx = 0, wz = 0;
  if (moving) {
    var ang = Math.atan2(ix, iz) + camYaw;
    wx = Math.sin(ang) * SPEED;
    wz = Math.cos(ang) * SPEED;
    player.yaw = lerpAngle(player.yaw, Math.atan2(wx, wz), dt * 12);
  }
  player.vel.x = lerp(player.vel.x, wx, dt * (player.grounded ? 14 : 5));
  player.vel.z = lerp(player.vel.z, wz, dt * (player.grounded ? 14 : 5));

  if ((keys.Space) && player.grounded) {
    player.vel.y = JUMP;
    player.grounded = false;
  }

  var next = player.pos.clone().addScaledVector(player.vel, dt);
  var grounded = false;
  var riding = null;

  for (var j = 0; j < platforms.length; j++) {
    var q = platforms[j];
    if (q.kind === 'spinner') { spinnerHit(q); continue; }
    var c = q.mesh.position;
    var hx = q.half.x + PR, hy = q.half.y, hz = q.half.z + PR;
    var dx = next.x - c.x, dz = next.z - c.z;
    if (Math.abs(dx) > hx || Math.abs(dz) > hz) continue;
    var footNow = player.pos.y, footNext = next.y;
    var top = c.y + hy, bottom = c.y - hy;
    // landing on top
    if (footNow >= top - 0.12 && footNext <= top + 0.02 && player.vel.y <= 0) {
      next.y = top;
      player.vel.y = 0;
      grounded = true;
      if (q.kind === 'mover') riding = q;
      touched(q);
      continue;
    }
    // head bump
    if (footNow + PH <= bottom + 0.12 && footNext + PH >= bottom && player.vel.y > 0) {
      next.y = bottom - PH;
      player.vel.y = 0;
      continue;
    }
    // side push
    if (footNext < top - 0.05 && footNext + PH > bottom + 0.05) {
      var ox = hx - Math.abs(dx), oz = hz - Math.abs(dz);
      if (ox < oz) { next.x = c.x + Math.sign(dx) * hx; player.vel.x = 0; }
      else { next.z = c.z + Math.sign(dz) * hz; player.vel.z = 0; }
      touched(q);
    }
  }

  if (riding && riding.delta) next.x += riding.delta;

  player.pos.copy(next);
  player.grounded = grounded;

  if (player.pos.y < -25) respawn(true);
}

function spinnerHit(q) {
  // bar is 10 x 0.6 x 0.9 rotating around Y
  var rel = player.pos.clone().sub(q.mesh.position);
  if (Math.abs(rel.y + 0) > 2.2 && Math.abs(rel.y) > 2.2) return;
  if (player.pos.y > q.mesh.position.y + 0.5 || player.pos.y + PH < q.mesh.position.y - 0.5) return;
  var a = -q.mesh.rotation.y;
  var lx = rel.x * Math.cos(a) - rel.z * Math.sin(a);
  var lz = rel.x * Math.sin(a) + rel.z * Math.cos(a);
  if (Math.abs(lx) < 5 + PR && Math.abs(lz) < 0.45 + PR) respawn(true);
}

function touched(q) {
  if (q.kind === 'kill') { respawn(true); return; }
  if (q.kind === 'checkpoint') {
    var n = q.extra.n;
    if (n > player.stage) {
      player.stage = n;
      player.checkpoint.set(q.mesh.position.x, q.mesh.position.y + q.half.y + 0.1, q.mesh.position.z);
      flash('Checkpoint ' + n + '!', '#69f0ae');
      netSend({ t: 'stage', n: n });
    }
  }
  if (q.kind === 'win' && !player.won) {
    player.won = true;
    flash('🏆 YOU WIN! 🏆', '#ffd700');
    netSend({ t: 'win' });
  }
}

function lerpAngle(a, b, t) {
  var d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * clamp(t, 0, 1);
}

// ---------------------------------------------------------------- multiplayer
var others = {}; // id -> {avatar, tag, target:{pos,yaw}, name}
var ws = null, myId = null, connected = false;
var connEl = document.getElementById('conn');
var lastNetSend = 0;

function setConn(on, label) {
  connected = on;
  connEl.className = on ? 'on' : 'off';
  connEl.textContent = label;
}

function netSend(obj) {
  if (ws && ws.readyState === 1) {
    try { ws.send(JSON.stringify(obj)); } catch (e) {}
  }
}

function connect() {
  var url = (localStorage.getItem('bw_server') || '').trim();
  if (!url) { setConn(false, '● Solo mode (no server set)'); return; }
  setConn(false, '● Connecting…');
  try { ws = new WebSocket(url); } catch (e) { setConn(false, '● Solo mode (bad address)'); return; }

  ws.onopen = function () {
    setConn(true, '● Online');
    netSend({ t: 'join', name: myName, game: 'obby', look: myLook });
  };
  ws.onclose = function () {
    setConn(false, '● Solo mode (disconnected)');
    for (var id in others) removeOther(id);
    ws = null;
    setTimeout(connect, 5000);
  };
  ws.onerror = function () { try { ws.close(); } catch (e) {} };
  ws.onmessage = function (ev) {
    var m;
    try { m = JSON.parse(ev.data); } catch (e) { return; }
    handleNet(m);
  };
}

function addOther(id, name, look) {
  if (others[id] || id === myId) return;
  var av = makeAvatar(look || {});
  av.group.add(makeNameTag(name || 'Guest'));
  scene.add(av.group);
  others[id] = {
    avatar: av, name: name || 'Guest',
    target: { pos: new THREE.Vector3(0, 3, 0), yaw: 0, grounded: true, speed: 0 }
  };
}

function removeOther(id) {
  var o = others[id];
  if (!o) return;
  scene.remove(o.avatar.group);
  delete others[id];
}

function handleNet(m) {
  switch (m.t) {
    case 'hello':
      myId = m.id;
      (m.players || []).forEach(function (p) { addOther(p.id, p.name, p.look); });
      chatLine('SYSTEM', 'Connected! ' + (m.players ? m.players.length : 0) + ' other player(s) here.');
      break;
    case 'join':
      addOther(m.id, m.name, m.look);
      chatLine('SYSTEM', esc(m.name) + ' joined the obby');
      break;
    case 'leave':
      if (others[m.id]) chatLine('SYSTEM', esc(others[m.id].name) + ' left');
      removeOther(m.id);
      break;
    case 'state':
      var o = others[m.id];
      if (o) {
        o.target.pos.set(m.p[0], m.p[1], m.p[2]);
        o.target.yaw = m.p[3];
        o.target.grounded = !!m.g;
        o.target.speed = m.s || 0;
      }
      break;
    case 'chat':
      var who = others[m.id];
      chatLine(who ? who.name : 'Guest', m.m);
      break;
    case 'stageAnn':
      chatLine('SYSTEM', esc(m.name) + ' reached checkpoint ' + m.n + '!');
      break;
    case 'winAnn':
      chatLine('SYSTEM', '🏆 ' + esc(m.name) + ' finished the obby!');
      break;
    case 'sys':
      chatLine('SYSTEM', m.m);
      break;
  }
}

// ---------------------------------------------------------------- chat
var chatlog = document.getElementById('chatlog');
var chatin = document.getElementById('chatin');

function chatLine(name, text) {
  var d = document.createElement('div');
  d.innerHTML = '<span class="n">' + esc(name) + ':</span> ' + esc(text);
  chatlog.appendChild(d);
  while (chatlog.children.length > 40) chatlog.removeChild(chatlog.firstChild);
  chatlog.scrollTop = chatlog.scrollHeight;
}

function openChat() {
  chatOpen = true;
  chatin.style.display = 'block';
  setTimeout(function () { chatin.focus(); }, 0);
}
chatin.addEventListener('keydown', function (e) {
  e.stopPropagation();
  if (e.code === 'Enter') {
    var v = chatin.value.trim().slice(0, 140);
    if (v) {
      chatLine(myName, v);
      netSend({ t: 'chat', m: v });
    }
    chatin.value = '';
    chatin.style.display = 'none';
    chatOpen = false;
  } else if (e.code === 'Escape') {
    chatin.value = '';
    chatin.style.display = 'none';
    chatOpen = false;
  }
});

// ---------------------------------------------------------------- HUD + loop
var hud = document.getElementById('hud');
var perf0 = performance.now();
function perf() { return (performance.now() - perf0) / 1000; }

window.addEventListener('resize', function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

var last = performance.now();
function tick(now) {
  requestAnimationFrame(tick);
  var dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  collideAndMove(dt);

  // my avatar
  myAvatar.group.position.copy(player.pos);
  myAvatar.group.rotation.y = player.yaw;
  var hSpeed = Math.hypot(player.vel.x, player.vel.z);
  myAvatar.animate(dt, hSpeed, player.grounded);

  // others (interp)
  for (var id in others) {
    var o = others[id];
    var g = o.avatar.group;
    g.position.lerp(o.target.pos, Math.min(dt * 12, 1));
    g.rotation.y = lerpAngle(g.rotation.y, o.target.yaw, dt * 12);
    o.avatar.animate(dt, o.target.speed, o.target.grounded);
  }

  // camera
  var cx = player.pos.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist;
  var cz = player.pos.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist;
  var cy = player.pos.y + 1.8 + Math.sin(camPitch) * camDist;
  camera.position.set(cx, cy, cz);
  camera.lookAt(player.pos.x, player.pos.y + 1.6, player.pos.z);

  // net state ~15 Hz
  if (now - lastNetSend > 66) {
    lastNetSend = now;
    netSend({
      t: 'state',
      p: [+player.pos.x.toFixed(2), +player.pos.y.toFixed(2), +player.pos.z.toFixed(2), +player.yaw.toFixed(2)],
      g: player.grounded ? 1 : 0,
      s: +hSpeed.toFixed(1)
    });
  }

  hud.innerHTML = '<b>' + esc(myName) + '</b><br>Stage: ' + player.stage + ' / 4' +
    (player.won ? ' 🏆' : '') + '<br>Deaths: ' + player.deaths +
    '<br>Players: ' + (Object.keys(others).length + 1);

  renderer.render(scene, camera);
}

connect();
requestAnimationFrame(tick);
