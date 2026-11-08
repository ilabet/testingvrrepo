import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import nmv from '@caspertech/node-metaverse';

const run = promisify(execFile);
const { LLMesh } = nmv;

export const MAX_TEXTURE_SIZE = Number(process.env.MAX_TEXTURE_SIZE ?? 512);

class LruCache {
  constructor(limit) { this.limit = limit; this.map = new Map(); }
  get(k) { const v = this.map.get(k); if (v !== undefined) { this.map.delete(k); this.map.set(k, v); } return v; }
  set(k, v) { this.map.set(k, v); while (this.map.size > this.limit) this.map.delete(this.map.keys().next().value); }
}

const textureCache = new LruCache(Number(process.env.TEXTURE_CACHE_ENTRIES ?? 2000));
const meshCache = new LruCache(Number(process.env.MESH_CACHE_ENTRIES ?? 500));
const inflight = new Map();

function once(key, fn) {
  if (inflight.has(key)) return inflight.get(key);
  const p = fn().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

function j2cReduceLevels(buf) {
  // SIZ marker: width/height at fixed offsets after FF4F FF51
  if (buf.length < 16 || buf.readUInt16BE(0) !== 0xff4f || buf.readUInt16BE(2) !== 0xff51) return 0;
  const w = buf.readUInt32BE(8), h = buf.readUInt32BE(12);
  let levels = 0;
  while (Math.max(w, h) >> levels > MAX_TEXTURE_SIZE && levels < 5) levels++;
  return levels;
}

export async function j2cToWebp(j2c) {
  const dir = await mkdtemp(path.join(tmpdir(), 'slvr-'));
  try {
    const inFile = path.join(dir, 'in.j2k');
    const outFile = path.join(dir, 'out.png');
    await writeFile(inFile, j2c);
    const reduce = j2cReduceLevels(j2c);
    await run('opj_decompress', ['-i', inFile, '-o', outFile, '-r', String(reduce), '-quiet'], { timeout: 20000 });
    const png = await readFile(outFile);
    let img = sharp(png);
    const meta = await img.metadata();
    let alpha = 'none';
    if (meta.hasAlpha) {
      const stats = await img.stats();
      const a = stats.channels[stats.channels.length - 1];
      if (a.min < 250) alpha = isBinaryAlpha(a) ? 'mask' : 'blend';
    }
    img = sharp(png).resize(MAX_TEXTURE_SIZE, MAX_TEXTURE_SIZE, { fit: 'inside', withoutEnlargement: true });
    const data = await img.webp({ quality: 82, alphaQuality: 90 }).toBuffer();
    return { data, alpha };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function isBinaryAlpha(a) {
  // Mostly 0/255 alpha behaves better as alpha-test than blending.
  return a.stdev > 100;
}

export async function getTexture(session, uuid) {
  const hit = textureCache.get(uuid);
  if (hit) return hit;
  return once(`t:${uuid}`, async () => {
    const result = await session.loadTexture(uuid);
    textureCache.set(uuid, result);
    return result;
  });
}

function flattenSubmesh(sm) {
  if (sm.noGeometry || !sm.position || !sm.triangleList) return null;
  const positions = new Float32Array(sm.position.length * 3);
  sm.position.forEach((p, i) => { positions[i * 3] = p.x; positions[i * 3 + 1] = p.y; positions[i * 3 + 2] = p.z; });
  let normals = null;
  if (sm.normal?.length === sm.position.length) {
    normals = new Float32Array(sm.normal.length * 3);
    sm.normal.forEach((n, i) => { normals[i * 3] = n.x; normals[i * 3 + 1] = n.y; normals[i * 3 + 2] = n.z; });
  }
  let uvs = null;
  if (sm.texCoord0?.length === sm.position.length) {
    uvs = new Float32Array(sm.texCoord0.length * 2);
    sm.texCoord0.forEach((t, i) => { uvs[i * 2] = t.x; uvs[i * 2 + 1] = t.y; });
  }
  const b64 = (a) => (a ? Buffer.from(a.buffer).toString('base64') : null);
  return { positions: b64(positions), normals: b64(normals), uvs: b64(uvs), indices: b64(Uint32Array.from(sm.triangleList)) };
}

export function meshAssetToJson(llmesh) {
  const lod = ['high_lod', 'medium_lod', 'low_lod', 'lowest_lod'].find((k) => llmesh.lodLevels[k]?.length);
  if (!lod) return { faces: [] };
  return { lod, rigged: Boolean(llmesh.skin), faces: llmesh.lodLevels[lod].map(flattenSubmesh) };
}

export async function decodeMesh(buf) {
  return meshAssetToJson(await LLMesh.from(buf));
}

export async function getMesh(session, uuid) {
  const hit = meshCache.get(uuid);
  if (hit) return hit;
  return once(`m:${uuid}`, async () => {
    const result = await session.loadMesh(uuid);
    meshCache.set(uuid, result);
    return result;
  });
}
