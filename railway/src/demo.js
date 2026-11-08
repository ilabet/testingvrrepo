import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

const PRIM = 9;
const AVATAR = 47;
const SIZE = 256;
const WATER = 20;
const AV_OFFSET = 0.9;

export function demoHeight(x, y) {
  const dx = x - 128, dy = y - 128;
  const d = Math.sqrt(dx * dx + dy * dy);
  const hills = 2.5 * Math.sin(x / 17) * Math.cos(y / 23) + 1.2 * Math.sin((x + y) / 9);
  const flat = Math.min(1, Math.max(0, (d - 20) / 15));
  return Math.max(12, 27 - Math.max(0, d - 60) / 6 + hills * flat * Math.min(1, Math.max(0, (110 - d) / 40)));
}

function quatZ(a) { return [0, 0, Math.sin(a / 2), Math.cos(a / 2)]; }

const TEXTURES = {
  checker: randomUUID(),
  brick: randomUUID(),
  stripes: randomUUID(),
  leaf: randomUUID(),
};

async function makeTexture(kind) {
  const n = 128;
  const raw = Buffer.alloc(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4;
      let c = [255, 255, 255, 255];
      if (kind === 'checker') c = ((x >> 4) + (y >> 4)) & 1 ? [235, 235, 235, 255] : [60, 60, 70, 255];
      else if (kind === 'brick') {
        const row = y >> 4; const off = row & 1 ? 16 : 0;
        const mortar = (y & 15) < 2 || ((x + off) & 31) < 2;
        c = mortar ? [200, 195, 185, 255] : [150 + (row * 13) % 30, 60, 45, 255];
      } else if (kind === 'stripes') c = (x >> 3) & 1 ? [40, 120, 220, 255] : [250, 250, 250, 255];
      else if (kind === 'leaf') {
        const dx = x - 64, dy = y - 64;
        const inside = (dx * dx) / 3600 + (dy * dy) / 900 < 1;
        c = inside ? [40, 140 + (x % 40), 50, 255] : [0, 0, 0, 0];
      }
      raw.set(c, i);
    }
  }
  const data = await sharp(raw, { raw: { width: n, height: n, channels: 4 } }).webp({ quality: 90 }).toBuffer();
  return { data, alpha: kind === 'leaf' ? 'mask' : 'none' };
}

function face(tex, color = [1, 1, 1, 1], rep = [1, 1], extra = {}) {
  return { tex, color, rep, off: [0, 0], rot: 0, glow: 0, fullbright: false, ...extra };
}

function shape(over = {}) {
  return {
    pathCurve: 16, profileCurve: 1, pathBegin: 0, pathEnd: 1, pathScale: [1, 1], pathShear: [0, 0],
    pathTwist: 0, pathTwistBegin: 0, pathRadiusOffset: 0, pathTaper: [0, 0], pathRevolutions: 1, pathSkew: 0,
    profileBegin: 0, profileEnd: 1, profileHollow: 0, ...over,
  };
}

const PYRAMID_MESH = randomUUID();

function demoMesh() {
  const p = new Float32Array([-0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0, 0, 0.5]);
  const uv = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1, 0.5, 0.5]);
  const idx = new Uint32Array([0, 2, 1, 0, 3, 2, 0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4]);
  const b64 = (a) => Buffer.from(a.buffer).toString('base64');
  return { lod: 'high_lod', rigged: false, faces: [{ positions: b64(p), normals: null, uvs: b64(uv), indices: b64(idx) }] };
}

function buildScene() {
  let id = 1000;
  const objs = [];
  const add = (o) => { const obj = { id: id++, uuid: randomUUID(), parent: 0, pcode: PRIM, rot: [0, 0, 0, 1], ...o }; objs.push(obj); return obj; };
  const ground = (x, y) => demoHeight(x, y);
  const T = TEXTURES;

  add({ name: 'Plaza', pos: [128, 128, ground(128, 128) + 0.1], scale: [24, 24, 0.3], shape: shape(), te: { def: face(T.checker, [1, 1, 1, 1], [6, 6]), faces: [] } });
  add({ name: 'Brick Wall', pos: [128, 141, ground(128, 141) + 2], scale: [16, 0.5, 4], shape: shape(), te: { def: face(T.brick, [1, 1, 1, 1], [4, 1]), faces: [] } });
  add({ name: 'Sphere', pos: [120, 124, ground(120, 124) + 2], scale: [2, 2, 2], shape: shape({ pathCurve: 32, profileCurve: 5 }), te: { def: face(T.stripes), faces: [] } });
  add({ name: 'Cylinder', pos: [124, 120, ground(124, 120) + 1.5], scale: [1, 1, 3], shape: shape({ profileCurve: 0 }), te: { def: face(null, [0.9, 0.6, 0.1, 1]), faces: [] } });
  add({ name: 'Hollow Box', pos: [132, 120, ground(132, 120) + 1], scale: [2, 2, 2], shape: shape({ profileHollow: 0.5, pathTaper: [0.3, 0.3] }), te: { def: face(null, [0.3, 0.8, 0.4, 1]), faces: [] } });
  add({ name: 'Torus', pos: [136, 124, ground(136, 124) + 1.5], scale: [3, 3, 1], shape: shape({ pathCurve: 32, profileCurve: 0, pathScale: [1, 0.25] }), te: { def: face(null, [0.8, 0.2, 0.6, 1]), faces: [] } });
  add({ name: 'Prism', pos: [140, 130, ground(140, 130) + 1], scale: [2, 2, 2], shape: shape({ profileCurve: 3 }), te: { def: face(null, [0.2, 0.5, 0.9, 1]), faces: [] } });
  add({ name: 'Twisted Tower', pos: [116, 134, ground(116, 134) + 4], scale: [2, 2, 8], shape: shape({ pathTwist: 0.5 }), te: { def: face(T.stripes, [1, 1, 1, 1], [1, 4]), faces: [] } });
  add({ name: 'Glass Pane', pos: [128, 115, ground(128, 115) + 1.5], scale: [4, 0.1, 3], shape: shape(), te: { def: face(null, [0.6, 0.85, 1, 0.35]), faces: [] } });
  add({ name: 'Glow Orb', pos: [128, 128, ground(128, 128) + 4], scale: [0.6, 0.6, 0.6], shape: shape({ pathCurve: 32, profileCurve: 5 }), te: { def: face(null, [1, 0.95, 0.6, 1], [1, 1], { glow: 0.6, fullbright: true }), faces: [] }, light: { color: [1, 0.9, 0.6], radius: 10, intensity: 1, falloff: 0.75 } });
  add({ name: 'Pyramid Mesh', pos: [144, 118, ground(144, 118) + 1.5], scale: [3, 3, 3], shape: shape(), mesh: { uuid: PYRAMID_MESH, type: 5 }, te: { def: face(T.brick), faces: [] } });
  add({ name: 'Info Board', pos: [128, 140.6, ground(128, 140.6) + 2.2], scale: [3, 0.1, 1.5], shape: shape(), te: { def: face(null, [0.1, 0.1, 0.15, 1]), faces: [] }, text: { value: 'Touch me for a menu', color: [1, 1, 1, 1] }, dialog: true });
  add({ name: 'Chair', pos: [122, 132, ground(122, 132) + 0.4], scale: [0.6, 0.6, 0.8], shape: shape(), te: { def: face(null, [0.5, 0.3, 0.15, 1]), faces: [] }, sittable: true });

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const x = 128 + Math.cos(a) * 40, y = 128 + Math.sin(a) * 40, z = ground(x, y);
    const trunk = add({ name: 'Tree', pos: [x, y, z + 2], scale: [0.5, 0.5, 4], shape: shape({ profileCurve: 0, pathTaper: [0.4, 0.4] }), te: { def: face(null, [0.45, 0.3, 0.15, 1]), faces: [] } });
    add({ name: 'Leaves', parent: trunk.id, pos: [0, 0, 2.5], scale: [3, 3, 3], shape: shape({ pathCurve: 32, profileCurve: 5 }), te: { def: face(T.leaf, [1, 1, 1, 1], [3, 3]), faces: [] } });
  }
  return objs;
}

const NPCS = [
  { name: 'Ava Demo', r: 10, speed: 0.35, phase: 0 },
  { name: 'Bram Tester', r: 16, speed: -0.2, phase: 2 },
  { name: 'Cleo Builder', r: 6, speed: 0.5, phase: 4 },
];

export class DemoSession {
  constructor(send) {
    this.send = send;
    this.move = { fwd: 0, strafe: 0, up: 0, yaw: 0, fly: false, run: false };
    this.textureCache = new Map();
  }

  async login({ username }) {
    this.name = String(username || 'Demo Visitor').slice(0, 64);
    this.selfId = randomUUID();
    this.npcs = NPCS.map((n) => ({ ...n, id: randomUUID() }));
    this.send({ type: 'loginOk', agent: { id: this.selfId, name: this.name }, message: 'Demo mode: no Second Life connection.', demo: true });
    this.enterRegion('Demo Island', [128, 124]);
    this.start = Date.now();
    this.last = Date.now();
    this.timer = setInterval(() => this.tick(), 100);
  }

  enterRegion(name, [x, y]) {
    this.regionName = name;
    this.objects = buildScene();
    this.self = { pos: [x, y, demoHeight(x, y)], vz: 0, sitting: null };
    this.resync();
  }

  resync() {
    const name = this.regionName;
    this.send({ type: 'region', name, size: [SIZE, SIZE], waterHeight: WATER, grid: [1000, 1000] });
    const heights = new Float32Array(SIZE * SIZE);
    for (let j = 0; j < SIZE; j++) for (let i = 0; i < SIZE; i++) heights[j * SIZE + i] = demoHeight(i, j);
    this.send({ type: 'terrain', size: SIZE, heights: Buffer.from(heights.buffer).toString('base64') });
    this.send({ type: 'objects', upsert: this.objects.map(({ dialog, sittable, ...o }) => o), remove: [] });
  }

  tick() {
    const now = Date.now();
    const dt = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    const t = (now - this.start) / 1000;
    const m = this.move;
    const s = this.self;
    if (!s.sitting) {
      const speed = m.fly ? 10 : m.run ? 6 : 3.2;
      const fwd = Math.abs(m.fwd) > 0.2 ? Math.sign(m.fwd) : 0;
      const str = Math.abs(m.strafe) > 0.2 ? Math.sign(m.strafe) : 0;
      s.pos[0] += (Math.cos(m.yaw) * fwd + Math.sin(m.yaw) * str) * speed * dt;
      s.pos[1] += (Math.sin(m.yaw) * fwd - Math.cos(m.yaw) * str) * speed * dt;
      s.pos[0] = Math.min(255.5, Math.max(0.5, s.pos[0]));
      s.pos[1] = Math.min(255.5, Math.max(0.5, s.pos[1]));
      const g = demoHeight(s.pos[0], s.pos[1]);
      if (m.fly) s.pos[2] = Math.max(g, s.pos[2] + (Math.abs(m.up) > 0.2 ? Math.sign(m.up) * 6 * dt : 0));
      else if (m.up > 0.2 && s.pos[2] <= g + 0.01) s.vz = 5;
      if (!m.fly) { s.vz -= 9.8 * dt; s.pos[2] += s.vz * dt; if (s.pos[2] <= g) { s.pos[2] = g; s.vz = 0; } }
    }
    const list = [{ id: this.selfId, name: this.name, pos: [s.pos[0], s.pos[1], s.pos[2] + AV_OFFSET].map((v) => +v.toFixed(3)), rot: quatZ(m.yaw), self: true, sitting: Boolean(s.sitting) }];
    for (const n of this.npcs) {
      const a = n.phase + t * n.speed;
      const x = 128 + Math.cos(a) * n.r, y = 128 + Math.sin(a) * n.r;
      list.push({ id: n.id, name: n.name, pos: [+x.toFixed(3), +y.toFixed(3), +(demoHeight(x, y) + AV_OFFSET).toFixed(3)], rot: quatZ(a + Math.sign(n.speed) * Math.PI / 2), self: false });
    }
    if (Math.floor(t * 10) % 2 === 0) this.send({ type: 'avatars', list });
    const spin = this.objects.find((o) => o.name === 'Twisted Tower');
    if (spin && Math.floor(t * 10) % 5 === 0) {
      spin.rot = quatZ(t * 0.3);
      this.send({ type: 'objects', upsert: [{ ...spin, dialog: undefined }], remove: [] });
    }
  }

  npcSay(i, text) {
    const n = this.npcs[i];
    this.send({ type: 'chat', from: n.name, fromId: n.id, chatType: 1, sourceType: 1, text });
  }

  async handle(msg) {
    switch (msg.type) {
      case 'move': this.move = { ...this.move, ...msg }; break;
      case 'chat': {
        const text = String(msg.text ?? '').slice(0, 1023);
        this.send({ type: 'chat', from: this.name, fromId: this.selfId, chatType: msg.mode === 'shout' ? 2 : msg.mode === 'whisper' ? 0 : 1, sourceType: 1, text });
        if (/^\/lure/.test(text)) {
          const id = randomUUID();
          this.pendingLure = id;
          this.send({ type: 'lure', id, from: this.npcs[1].name, text: 'Join me at Sandbox!' });
        } else setTimeout(() => this.npcSay(Math.floor(Math.random() * 3), `You said "${text}". Welcome to VR!`), 800);
        break;
      }
      case 'im': setTimeout(() => this.send({ type: 'im', from: this.npcs[0].name, fromId: this.npcs[0].id, text: `Auto-reply: got "${String(msg.text).slice(0, 200)}"` }), 600); break;
      case 'teleport': this.doTeleport(String(msg.region || 'Demo Island'), msg.pos); break;
      case 'home': this.doTeleport('Demo Island', [128, 124]); break;
      case 'acceptLure': if (msg.id === this.pendingLure) this.doTeleport('Sandbox', [128, 128]); break;
      case 'touch': {
        const o = this.objects.find((x) => x.id === Number(msg.id));
        if (!o) break;
        if (o.dialog) this.send({ type: 'dialog', id: randomUUID(), object: o.name, text: 'Pick a color for the sphere', buttons: ['Red', 'Green', 'Blue'] });
        else this.send({ type: 'chat', from: o.name, fromId: o.uuid, chatType: 1, sourceType: 2, text: `${this.name} touched me.` });
        break;
      }
      case 'dialogReply': {
        const colors = { 0: [1, 0.2, 0.2, 1], 1: [0.2, 1, 0.2, 1], 2: [0.2, 0.4, 1, 1] };
        const sphere = this.objects.find((x) => x.name === 'Sphere');
        if (sphere && colors[msg.index]) {
          sphere.te = { def: { ...sphere.te.def, tex: null, color: colors[msg.index] }, faces: [] };
          this.send({ type: 'objects', upsert: [sphere], remove: [] });
        }
        break;
      }
      case 'sit': {
        const o = this.objects.find((x) => x.id === Number(msg.id));
        if (o) { this.self.sitting = o.id; this.self.pos = [o.pos[0], o.pos[1], o.pos[2] + 0.2]; }
        break;
      }
      case 'stand': if (this.self.sitting) { this.self.sitting = null; this.self.pos[1] += 0.8; } break;
      default: break;
    }
  }

  doTeleport(region, pos) {
    this.send({ type: 'teleport', state: 0, message: `Teleporting to ${region}` });
    const p = Array.isArray(pos) ? pos : [128, 124];
    setTimeout(() => {
      this.send({ type: 'objects', upsert: [], remove: this.objects.map((o) => o.id) });
      this.enterRegion(region, p);
      this.send({ type: 'teleport', state: 1, message: 'Teleport finished' });
    }, 500);
  }

  async loadTexture(uuid) {
    const kind = Object.keys(TEXTURES).find((k) => TEXTURES[k] === uuid);
    if (!kind) throw new Error('not found');
    if (!this.textureCache.has(kind)) this.textureCache.set(kind, await makeTexture(kind));
    return this.textureCache.get(kind);
  }

  async loadMesh(uuid) {
    if (uuid !== PYRAMID_MESH) throw new Error('not found');
    return demoMesh();
  }

  async close() { clearInterval(this.timer); }
}

export { PRIM, AVATAR };
