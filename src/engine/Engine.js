// BloxWorlds Engine — core renderer + scene + game loop
import * as THREE from 'three';

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 120, 420);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(60, 120, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -140, right: 140, top: 140, bottom: -140, far: 420 });
    this.scene.add(sun);
    this.scene.add(new THREE.AmbientLight(0xbfd9ff, 1.1));
    this.scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x6a8f5a, 0.6));
    this.sun = sun;

    this._systems = [];
    this._last = performance.now();
    this._t0 = performance.now();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  get time() { return (performance.now() - this._t0) / 1000; }

  addSystem(fn) { this._systems.push(fn); return this; }

  addClouds(count = 26) {
    const cg = new THREE.SphereGeometry(1, 8, 6);
    const cm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    for (let i = 0; i < count; i++) {
      const cl = new THREE.Group();
      const n = 3 + ((Math.random() * 3) | 0);
      for (let j = 0; j < n; j++) {
        const s = new THREE.Mesh(cg, cm);
        s.position.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 5);
        const k = 2.5 + Math.random() * 3.5;
        s.scale.set(k * 1.6, k * 0.7, k);
        cl.add(s);
      }
      cl.position.set((Math.random() - 0.5) * 480, 55 + Math.random() * 60, (Math.random() - 0.5) * 480);
      this.scene.add(cl);
    }
  }

  start() {
    const loop = (now) => {
      requestAnimationFrame(loop);
      const dt = Math.min((now - this._last) / 1000, 0.05);
      this._last = now;
      for (const s of this._systems) s(dt, now);
      this.renderer.render(this.scene, this.camera);
    };
    requestAnimationFrame(loop);
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
