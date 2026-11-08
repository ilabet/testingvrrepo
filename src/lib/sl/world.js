import * as THREE from 'three';
import { buildPrimGeometry } from './prim.js';

const PCODE_AVATAR = 47;
const INVISIBLE = new Set(['8dcd4a48-2d37-4909-9f78-f7a9eb4ef903', '38b86f85-2575-52a9-a531-23108d8da837', 'e97cf410-8e61-7005-ec06-629eba4cd1fb', 'f54a0c32-3cd1-d49a-5b4f-7b792bebc204']);
const BLANK = new Set(['5748decc-f629-461c-9a36-a35a221fe21f', '00000000-0000-0000-0000-000000000000']);
const MAX_LIGHTS = 6;

export const AV_OFFSET = 0.9;
export const slToThree = (p) => new THREE.Vector3(p[0], p[2], -p[1]);

function b64ToTyped(b64, Type) {
  if (!b64) return null;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Type(bytes.buffer);
}

export function textSprite(text, { color = '#fff', size = 0.18, bg = 'rgba(0,0,0,0.45)' } = {}) {
  const lines = String(text).split('\n').slice(0, 4);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = '32px sans-serif';
  const w = Math.min(1024, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 24);
  canvas.width = w; canvas.height = lines.length * 40 + 12;
  ctx.font = '32px sans-serif';
  ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color; ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, 12, 8 + i * 40));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  sprite.scale.set((size * canvas.width) / 40, (size * canvas.height) / 40, 1);
  sprite.renderOrder = 10;
  return sprite;
}

class TextureLoader {
  constructor() { this.base = new Map(); this.queue = []; this.active = 0; this.token = null; this.origin = ''; }
  load(uuid) {
    if (!this.base.has(uuid)) {
      this.base.set(uuid, new Promise((resolve) => { this.queue.push({ uuid, resolve }); this.pump(); }));
    }
    return this.base.get(uuid);
  }
  pump() {
    while (this.active < 6 && this.queue.length && this.token) {
      const { uuid, resolve } = this.queue.shift();
      this.active++;
      fetch(`${this.origin}/asset/texture/${this.token}/${uuid}`)
        .then(async (res) => {
          if (!res.ok) return resolve(null);
          const alpha = res.headers.get('X-Alpha-Mode') || 'none';
          const bitmap = await createImageBitmap(await res.blob(), { imageOrientation: 'flipY' });
          resolve({ bitmap, alpha });
        })
        .catch(() => resolve(null))
        .finally(() => { this.active--; this.pump(); });
    }
  }
  reset(token, origin = '') { this.token = token; this.origin = origin; this.base.clear(); this.queue = []; }
}

export class World {
  constructor(scene, { origin = '' } = {}) {
    this.scene = scene;
    this.origin = origin;
    this.root = new THREE.Group();
    this.root.rotation.x = -Math.PI / 2;
    scene.add(this.root);
    this.objects = new Map();
    this.pendingChildren = new Map();
    this.avatarLocalIds = new Set();
    this.avatars = new Map();
    this.pickables = [];
    this.textures = new TextureLoader();
    this.materials = new Map();
    this.meshCache = new Map();
    this.lights = 0;
    this.heights = null;
    this.waterHeight = 20;
    this.regionSize = [256, 256];
    this.terrain = null;
    const waterGeo = new THREE.PlaneGeometry(2048, 2048);
    this.water = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({ color: 0x2a6f9e, transparent: true, opacity: 0.75, roughness: 0.2, metalness: 0.1 }));
    this.water.position.set(128, 128, this.waterHeight);
    this.root.add(this.water);
  }

  setToken(token) { this.token = token; this.textures.reset(token, this.origin); this.meshCache.clear(); }

  clear() {
    for (const id of [...this.objects.keys()]) this.removeObject(id);
    this.pendingChildren.clear();
    this.avatarLocalIds.clear();
    for (const a of this.avatars.values()) this.root.remove(a.group);
    this.avatars.clear();
    this.pickables = [];
    this.lights = 0;
  }

  setRegion(msg) {
    this.clear();
    this.regionName = msg.name;
    this.regionSize = msg.size;
    this.waterHeight = msg.waterHeight ?? 20;
    this.water.position.set(msg.size[0] / 2, msg.size[1] / 2, this.waterHeight);
  }

  setTerrain(msg) {
    const n = msg.size;
    const h = b64ToTyped(msg.heights, Float32Array);
    this.heights = { n, h };
    const pos = new Float32Array(n * n * 3);
    const col = new Float32Array(n * n * 3);
    const c = new THREE.Color();
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = j * n + i, z = h[k];
        pos.set([i, j, z], k * 3);
        const rel = z - this.waterHeight;
        if (rel < 1) c.setRGB(0.76, 0.7, 0.5);
        else if (rel < 18) c.setRGB(0.3 + Math.random() * 0.03, 0.5 + Math.random() * 0.04, 0.22);
        else c.setRGB(0.45, 0.43, 0.4);
        col.set([c.r, c.g, c.b], k * 3);
      }
    }
    const idx = new Uint32Array((n - 1) * (n - 1) * 6);
    let p = 0;
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const a = j * n + i, b = a + 1, d = a + n, e = d + 1;
      idx.set([a, b, e, a, e, d], p); p += 6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    if (this.terrain) { this.root.remove(this.terrain); this.terrain.geometry.dispose(); }
    this.terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    this.terrain.userData.terrain = true;
    this.root.add(this.terrain);
  }

  heightAt(x, y) {
    if (!this.heights) return 0;
    const { n, h } = this.heights;
    const cx = Math.min(n - 1.001, Math.max(0, x)), cy = Math.min(n - 1.001, Math.max(0, y));
    const i = Math.floor(cx), j = Math.floor(cy), fx = cx - i, fy = cy - j;
    const v = (a, b) => h[b * n + a];
    return v(i, j) * (1 - fx) * (1 - fy) + v(i + 1, j) * fx * (1 - fy) + v(i, j + 1) * (1 - fx) * fy + v(i + 1, j + 1) * fx * fy;
  }

  applyObjects(msg) {
    for (const id of msg.remove) this.removeObject(id);
    for (const o of msg.upsert) this.upsert(o);
  }

  upsert(o) {
    if (o.pcode === PCODE_AVATAR) { this.avatarLocalIds.add(o.id); return; }
    if (o.attachment || (o.parent && this.avatarLocalIds.has(o.parent))) return;
    let entry = this.objects.get(o.id);
    const visualKey = JSON.stringify([o.shape, o.te, o.mesh, o.sculpt, o.scale, o.text, o.light]);
    if (!entry) {
      const group = new THREE.Group();
      entry = { data: o, group, mesh: null, visualKey: null };
      this.objects.set(o.id, entry);
    }
    entry.data = o;
    entry.group.position.set(...o.pos);
    entry.group.quaternion.set(...o.rot);
    if (entry.visualKey !== visualKey) { this.buildVisual(entry); entry.visualKey = visualKey; }
    this.attach(entry);
  }

  attach(entry) {
    const o = entry.data;
    const parent = o.parent ? this.objects.get(o.parent) : null;
    if (o.parent && !parent) {
      if (!this.pendingChildren.has(o.parent)) this.pendingChildren.set(o.parent, new Set());
      this.pendingChildren.get(o.parent).add(o.id);
      entry.group.removeFromParent();
      return;
    }
    const target = parent ? parent.group : this.root;
    if (entry.group.parent !== target) target.add(entry.group);
    const waiting = this.pendingChildren.get(o.id);
    if (waiting) {
      this.pendingChildren.delete(o.id);
      for (const cid of waiting) { const c = this.objects.get(cid); if (c) this.attach(c); }
    }
  }

  buildVisual(entry) {
    const o = entry.data;
    if (entry.mesh) { entry.group.remove(entry.mesh); this.pickables = this.pickables.filter((m) => m !== entry.mesh); }
    if (entry.label) { entry.group.remove(entry.label); entry.label = null; }
    if (entry.light) { entry.group.remove(entry.light); entry.light = null; this.lights--; }
    let geo;
    if (o.mesh) geo = new THREE.BoxGeometry(1, 1, 1);
    else if (o.sculpt) geo = new THREE.SphereGeometry(0.5, 16, 12).rotateX(Math.PI / 2);
    else if (o.shape) geo = buildPrimGeometry(o.shape);
    else return;
    const mesh = new THREE.Mesh(geo, this.materialsFor(o.te, geo, Boolean(o.mesh)));
    mesh.scale.set(...o.scale);
    mesh.userData = { localId: o.id, name: o.name };
    entry.mesh = mesh;
    entry.group.add(mesh);
    this.pickables.push(mesh);
    if (o.mesh) this.loadMesh(entry, o.mesh.uuid);
    if (o.text?.value) {
      const c = o.text.color;
      const label = textSprite(o.text.value, { color: `rgba(${c[0] * 255 | 0},${c[1] * 255 | 0},${c[2] * 255 | 0},${c[3] ?? 1})`, size: 0.2, bg: 'rgba(0,0,0,0)' });
      label.position.set(0, 0, o.scale[2] / 2 + 0.25);
      entry.label = label;
      entry.group.add(label);
    }
    if (o.light && this.lights < MAX_LIGHTS) {
      const [r, g, b] = o.light.color;
      const light = new THREE.PointLight(new THREE.Color(r, g, b), (o.light.intensity ?? 1) * 4, o.light.radius ?? 10, 1 + (o.light.falloff ?? 0.75));
      entry.light = light;
      entry.group.add(light);
      this.lights++;
    }
  }

  async loadMesh(entry, uuid) {
    if (!this.meshCache.has(uuid)) {
      this.meshCache.set(uuid, fetch(`${this.origin}/asset/mesh/${this.token}/${uuid}`).then((r) => (r.ok ? r.json() : null)).catch(() => null));
    }
    const data = await this.meshCache.get(uuid);
    if (!data || !entry.mesh || entry.data.mesh?.uuid !== uuid || !data.faces.length) return;
    const pos = [], nrm = [], uv = [], idx = [];
    const geo = new THREE.BufferGeometry();
    let hasNormals = true;
    data.faces.forEach((f, face) => {
      if (!f) return;
      const base = pos.length / 3, start = idx.length;
      const p = b64ToTyped(f.positions, Float32Array);
      const n = b64ToTyped(f.normals, Float32Array);
      const t = b64ToTyped(f.uvs, Float32Array);
      const ix = b64ToTyped(f.indices, Uint32Array);
      pos.push(...p);
      if (n) nrm.push(...n); else hasNormals = false;
      if (t) uv.push(...t); else uv.push(...new Array((p.length / 3) * 2).fill(0));
      for (const i of ix) idx.push(base + i);
      geo.addGroup(start, ix.length, face);
    });
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    if (hasNormals) geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    geo.setIndex(idx);
    if (!hasNormals) geo.computeVertexNormals();
    geo.computeBoundingSphere();
    entry.mesh.geometry.dispose();
    entry.mesh.geometry = geo;
    entry.mesh.material = this.materialsFor(entry.data.te, geo, false);
  }

  materialsFor(te, geo, placeholder) {
    if (placeholder) return new THREE.MeshStandardMaterial({ color: 0x888888, transparent: true, opacity: 0.25 });
    const count = Math.max(1, ...geo.groups.map((g) => g.materialIndex + 1));
    const mats = [];
    for (let i = 0; i < count; i++) mats.push(this.material(te?.faces?.[i] ?? te?.def));
    return geo.groups.length ? mats : mats[0];
  }

  material(f) {
    const face = f ?? { color: [1, 1, 1, 1] };
    const key = JSON.stringify(face);
    if (this.materials.has(key)) return this.materials.get(key);
    const [r, g, b, a] = face.color ?? [1, 1, 1, 1];
    const invisible = face.tex && INVISIBLE.has(face.tex);
    const params = { color: new THREE.Color(r, g, b), side: THREE.DoubleSide, transparent: a < 0.999, opacity: a, depthWrite: a >= 0.999 };
    const mat = face.fullbright ? new THREE.MeshBasicMaterial(params) : new THREE.MeshStandardMaterial({ ...params, roughness: 0.85, metalness: 0 });
    if (!face.fullbright && face.glow > 0) { mat.emissive = new THREE.Color(r, g, b); mat.emissiveIntensity = face.glow; }
    if (invisible || a < 0.01) mat.visible = false;
    if (face.tex && !BLANK.has(face.tex) && !invisible) {
      this.textures.load(face.tex).then((res) => {
        if (!res) return;
        const tex = new THREE.Texture(res.bitmap);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(face.rep?.[0] || 1, face.rep?.[1] || 1);
        tex.offset.set(face.off?.[0] || 0, face.off?.[1] || 0);
        tex.center.set(0.5, 0.5);
        tex.rotation = face.rot || 0;
        tex.needsUpdate = true;
        mat.map = tex;
        if (res.alpha === 'blend') { mat.transparent = true; mat.depthWrite = false; }
        if (res.alpha === 'mask') mat.alphaTest = 0.5;
        mat.needsUpdate = true;
      });
    }
    this.materials.set(key, mat);
    return mat;
  }

  removeObject(id) {
    const entry = this.objects.get(id);
    if (!entry) return;
    this.objects.delete(id);
    if (entry.light) this.lights--;
    entry.group.removeFromParent();
    if (entry.mesh) this.pickables = this.pickables.filter((m) => m !== entry.mesh);
    for (const child of entry.group.children) {
      if (child.isGroup) {
        const childEntry = [...this.objects.values()].find((e) => e.group === child);
        if (childEntry) {
          if (!this.pendingChildren.has(id)) this.pendingChildren.set(id, new Set());
          this.pendingChildren.get(id).add(childEntry.data.id);
        }
      }
    }
  }

  setAvatars(list) {
    const seen = new Set();
    for (const a of list) {
      seen.add(a.id);
      let av = this.avatars.get(a.id);
      if (!av) {
        av = this.makeAvatar(a);
        this.avatars.set(a.id, av);
        this.root.add(av.group);
        av.group.position.set(...a.pos);
      }
      av.self = a.self;
      av.group.visible = !a.self || Boolean(this.showSelf);
      av.target = new THREE.Vector3(...a.pos);
      av.targetRot = new THREE.Quaternion(...a.rot);
      av.data = a;
    }
    for (const [id, av] of this.avatars) if (!seen.has(id)) { this.root.remove(av.group); this.avatars.delete(id); }
  }

  makeAvatar(a) {
    const group = new THREE.Group();
    let hash = 0;
    for (const ch of a.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    const color = new THREE.Color().setHSL((hash % 360) / 360, 0.5, 0.55);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.9, 4, 12).rotateX(Math.PI / 2), mat);
    body.position.z = -0.1;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), new THREE.MeshStandardMaterial({ color: 0xf0c8a0, roughness: 0.6 }));
    head.position.z = 0.62;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 8).rotateZ(-Math.PI / 2), mat);
    nose.position.set(0.15, 0, 0.62);
    const label = textSprite(a.name || 'Resident', { size: 0.12 });
    label.position.z = 1.0;
    group.add(body, head, nose, label);
    for (const m of [body, head, nose]) m.userData = { avatarId: a.id, name: a.name };
    return { group, target: new THREE.Vector3(...a.pos), targetRot: new THREE.Quaternion(...a.rot) };
  }

  update(dt) {
    const k = 1 - Math.exp(-dt * 8);
    for (const av of this.avatars.values()) {
      if (av.group.position.distanceTo(av.target) > 20) av.group.position.copy(av.target);
      else av.group.position.lerp(av.target, k);
      av.group.quaternion.slerp(av.targetRot, k);
    }
  }

  dispose() {
    this.clear();
    this.scene.remove(this.root);
    this.terrain?.geometry.dispose();
  }
}
