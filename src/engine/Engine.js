// BloxWorlds Engine — core renderer + scene + game loop (Babylon.js)
import {
  Engine as BEngine, Scene, Vector3, Color3, Color4, FreeCamera,
  DirectionalLight, HemisphericLight, ShadowGenerator, MeshBuilder,
  StandardMaterial, DynamicTexture, Mesh
} from 'babylon';

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.babylon = new BEngine(canvas, true, { stencil: false, alpha: false }, true);
    this.babylon.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio, 2));

    const scene = new Scene(this.babylon);
    this.scene = scene;
    scene.clearColor = new Color4(0.53, 0.81, 0.92, 1);
    scene.ambientColor = new Color3(0.55, 0.62, 0.7);

    // fog
    scene.fogMode = Scene.FOGMODE_LINEAR;
    scene.fogStart = 120;
    scene.fogEnd = 420;
    scene.fogColor = new Color3(0.62, 0.83, 0.93);

    // camera (we position it manually every frame like the old engine)
    this.camera = new FreeCamera('cam', new Vector3(0, 6, 10), scene);
    this.camera.minZ = 0.1;
    this.camera.maxZ = 1000;
    this.camera.fov = 1.22; // ~70deg vertical
    this.camera.inputs.clear(); // fully manual

    // lights
    const sun = new DirectionalLight('sun', new Vector3(-0.45, -0.85, -0.3), scene);
    sun.position = new Vector3(60, 120, 40);
    sun.intensity = 1.35;
    sun.diffuse = new Color3(1, 0.96, 0.88);
    this.sun = sun;

    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.55;
    hemi.diffuse = new Color3(0.81, 0.91, 1);
    hemi.groundColor = new Color3(0.44, 0.49, 0.42);

    // shadows
    this.shadows = new ShadowGenerator(2048, sun);
    this.shadows.usePercentageCloserFiltering = true;
    this.shadows.bias = 0.0009;
    this.shadows.normalBias = 0.02;

    this._systems = [];
    this._t0 = performance.now();

    window.addEventListener('resize', () => this.babylon.resize());
  }

  get time() { return (performance.now() - this._t0) / 1000; }

  addSystem(fn) { this._systems.push(fn); return this; }

  // register a mesh as shadow caster + receiver
  addShadows(mesh) {
    this.shadows.addShadowCaster(mesh, true);
    mesh.receiveShadows = true;
    mesh.getChildMeshes && mesh.getChildMeshes().forEach((m) => { m.receiveShadows = true; });
    return mesh;
  }

  setSky(preset = 'day') {
    const P = {
      day:    { top: '#2a7fd4', mid: '#87ceeb', bot: '#dff1fa', fog: [0.62, 0.83, 0.93] },
      sunset: { top: '#3b2a68', mid: '#e2653e', bot: '#ffc46b', fog: [0.91, 0.57, 0.42] },
      night:  { top: '#050a1e', mid: '#14224a', bot: '#2c3e6e', fog: [0.10, 0.15, 0.28] }
    }[preset] || {};

    const tex = new DynamicTexture('skytex', { width: 32, height: 512 }, this.scene, false);
    const ctx = tex.getContext();
    const gr = ctx.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, P.top); gr.addColorStop(0.55, P.mid); gr.addColorStop(1, P.bot);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, 32, 512);
    tex.update(false);

    const dome = MeshBuilder.CreateSphere('sky', { diameter: 960, segments: 16, sideOrientation: Mesh.BACKSIDE }, this.scene);
    const mat = new StandardMaterial('skymat', this.scene);
    mat.emissiveTexture = tex;
    mat.diffuseColor = new Color3(0, 0, 0);
    mat.specularColor = new Color3(0, 0, 0);
    mat.disableLighting = true;
    mat.fogEnabled = false;
    dome.material = mat;
    dome.applyFog = false;
    dome.isPickable = false;
    this.skyDome = dome;
    // keep dome centered on camera
    this.addSystem(() => { dome.position.copyFrom(this.camera.position); });

    this.scene.fogColor = new Color3(...P.fog);
    if (preset === 'night') this._addStars();
    if (preset === 'sunset') {
      const ball = MeshBuilder.CreateSphere('sunball', { diameter: 44, segments: 10 }, this.scene);
      const bm = new StandardMaterial('sunballm', this.scene);
      bm.emissiveColor = new Color3(1, 0.86, 0.63);
      bm.disableLighting = true;
      bm.fogEnabled = false;
      ball.material = bm;
      ball.applyFog = false;
      ball.position.set(180, 60, -400);
      this.addSystem(() => {
        ball.position.set(this.camera.position.x + 180, this.camera.position.y + 60, this.camera.position.z - 400);
      });
    }
    return this;
  }

  _addStars() {
    const mat = new StandardMaterial('starm', this.scene);
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.disableLighting = true;
    mat.fogEnabled = false;
    const base = MeshBuilder.CreateBox('star0', { size: 1.4 }, this.scene);
    base.material = mat;
    base.applyFog = false;
    base.isVisible = false;
    const stars = [];
    for (let i = 0; i < 260; i++) {
      const t = Math.random() * Math.PI * 2, p = Math.random() * Math.PI * 0.48;
      const r = 460;
      const inst = base.createInstance('star' + i);
      inst.position.set(Math.cos(t) * Math.cos(p) * r, Math.sin(p) * r + 10, Math.sin(t) * Math.cos(p) * r);
      stars.push(inst);
    }
    this.addSystem(() => {
      for (const s of stars) { /* stars stay world-anchored; cheap enough */ }
    });
  }

  addClouds(count = 26) {
    const mat = new StandardMaterial('cloudm', this.scene);
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.disableLighting = true;
    mat.alpha = 0.85;
    mat.fogEnabled = false;
    for (let i = 0; i < count; i++) {
      const n = 3 + ((Math.random() * 3) | 0);
      for (let j = 0; j < n; j++) {
        const k = 2.5 + Math.random() * 3.5;
        const s = MeshBuilder.CreateSphere('cl', { diameterX: k * 3.2, diameterY: k * 1.4, diameterZ: k * 2, segments: 6 }, this.scene);
        s.material = mat;
        s.applyFog = false;
        s.isPickable = false;
        s.position.set(
          (Math.random() - 0.5) * 480 + (Math.random() - 0.5) * 8,
          55 + Math.random() * 60 + (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 480 + (Math.random() - 0.5) * 5
        );
      }
    }
  }

  start() {
    let last = performance.now();
    this.babylon.runRenderLoop(() => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      for (const s of this._systems) s(dt, now);
      this.scene.render();
    });
  }
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const lerpAngle = (a, b, t) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * clamp(t, 0, 1);
};
export const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
