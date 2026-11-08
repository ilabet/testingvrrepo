import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import WebSocket from 'ws';
import { parseUsername, resolveGrid, GRIDS } from '../src/session.js';
import { DemoSession, demoHeight } from '../src/demo.js';
import { meshAssetToJson } from '../src/assets.js';

test('parseUsername handles legacy and single-name accounts', () => {
  assert.deepEqual(parseUsername('Jane Doe'), { firstName: 'Jane', lastName: 'Doe' });
  assert.deepEqual(parseUsername('jane.doe'), { firstName: 'jane', lastName: 'doe' });
  assert.deepEqual(parseUsername('janedoe'), { firstName: 'janedoe', lastName: 'Resident' });
  assert.equal(resolveGrid('osgrid', false), GRIDS.osgrid);
  assert.throws(() => parseUsername('  '));
});

test('resolveGrid only allows custom grids when enabled', () => {
  assert.equal(resolveGrid(undefined, false), GRIDS.agni);
  assert.equal(resolveGrid('aditi', false), GRIDS.aditi);
  assert.throws(() => resolveGrid('http://example.test/login', false));
  assert.equal(resolveGrid('http://example.test/login', true), 'http://example.test/login');
});

test('meshAssetToJson picks highest available LOD', () => {
  const sm = { position: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }], triangleList: [0, 1, 2], normal: [], texCoord0: [] };
  const out = meshAssetToJson({ lodLevels: { medium_lod: [sm] } });
  assert.equal(out.lod, 'medium_lod');
  assert.equal(Buffer.from(out.faces[0].indices, 'base64').length, 12);
});

test('demo session emits region, terrain, objects and avatar movement', async () => {
  const msgs = [];
  const s = new DemoSession((m) => msgs.push(m));
  await s.login({ username: 'Tester' });
  const types = msgs.map((m) => m.type);
  for (const t of ['loginOk', 'region', 'terrain', 'objects']) assert.ok(types.includes(t), t);
  const terrain = msgs.find((m) => m.type === 'terrain');
  assert.equal(Buffer.from(terrain.heights, 'base64').length, 256 * 256 * 4);
  const start = [...s.self.pos];
  await s.handle({ type: 'move', fwd: 1, yaw: 0 });
  await new Promise((r) => setTimeout(r, 450));
  assert.ok(s.self.pos[0] > start[0] + 0.5);
  assert.ok(Math.abs(s.self.pos[2] - demoHeight(s.self.pos[0], s.self.pos[1])) < 0.6);
  const tex = await s.loadTexture(msgs.find((m) => m.type === 'objects').upsert.find((o) => o.te?.def?.tex).te.def.tex);
  assert.equal(tex.data.subarray(8, 12).toString(), 'WEBP');
  await s.close();
});

test('server serves client config and demo session over WebSocket', async () => {
  const port = 18000 + Math.floor(Math.random() * 1000);
  const proc = spawn(process.execPath, ['src/server.js'], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
  try {
    await once(proc.stdout, 'data');
    const cfg = await (await fetch(`http://localhost:${port}/config`)).json();
    assert.equal(cfg.demoOnly, false);
    const ws = new WebSocket(`ws://localhost:${port}/ws`);
    await once(ws, 'open');
    const seen = new Map();
    ws.on('message', (d) => { const m = JSON.parse(d); if (!seen.has(m.type)) seen.set(m.type, m); });
    ws.send(JSON.stringify({ type: 'login', mode: 'demo', username: 'WS Tester' }));
    await new Promise((r) => setTimeout(r, 600));
    assert.ok(seen.has('loginOk') && seen.has('avatars') && seen.has('assetToken'));
    const objs = seen.get('objects').upsert;
    const mesh = objs.find((o) => o.mesh);
    const res = await fetch(`http://localhost:${port}/asset/mesh/${seen.get('assetToken').token}/${mesh.mesh.uuid}`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).faces.length, 1);
    assert.equal((await fetch(`http://localhost:${port}/asset/mesh/bad/${mesh.mesh.uuid}`)).status, 404);
    ws.close();
  } finally {
    proc.kill();
  }
});

test('j2cToWebp decodes JPEG2000 codestreams with alpha', async (t) => {
  const { execFileSync } = await import('node:child_process');
  const { mkdtempSync, writeFileSync, readFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const sharp = (await import('sharp')).default;
  const { j2cToWebp } = await import('../src/assets.js');
  try { execFileSync('sh', ['-c', 'command -v opj_compress'], { stdio: 'ignore' }); } catch { t.skip('opj_compress not installed'); return; }
  const dir = mkdtempSync(path.join(tmpdir(), 'slvr-test-'));
  const raw = Buffer.alloc(64 * 64 * 4);
  for (let i = 0; i < 64 * 64; i++) raw.set([255, 0, 0, i % 64 < 32 ? 0 : 255], i * 4);
  writeFileSync(path.join(dir, 'in.png'), await sharp(raw, { raw: { width: 64, height: 64, channels: 4 } }).png().toBuffer());
  execFileSync('opj_compress', ['-i', path.join(dir, 'in.png'), '-o', path.join(dir, 'out.j2k')], { stdio: 'ignore' });
  const { data, alpha } = await j2cToWebp(readFileSync(path.join(dir, 'out.j2k')));
  assert.equal(data.subarray(8, 12).toString(), 'WEBP');
  assert.equal(alpha, 'mask');
});

test('HTTP /login (demo grid) returns a stream URL that a viewer can attach and re-attach to', async () => {
  const port = 19000 + Math.floor(Math.random() * 1000);
  const proc = spawn(process.execPath, ['src/server.js'], { env: { ...process.env, PORT: String(port), PROXY_TOKEN: 'secret-test' }, stdio: ['ignore', 'pipe', 'inherit'] });
  try {
    await once(proc.stdout, 'data');
    const base = `http://localhost:${port}`;
    assert.equal((await fetch(`${base}/health`)).status, 200);
    const denied = await fetch(`${base}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grid: 'demo' }) });
    assert.equal(denied.status, 401);
    const res = await fetch(`${base}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-proxy-token': 'secret-test' }, body: JSON.stringify({ first_name: 'Demo', grid: 'demo' }) });
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.match(data.ws_url, /^ws:\/\/localhost:\d+\/stream\?session=[0-9a-f]{32}$/);
    const connect = async () => {
      const ws = new WebSocket(data.ws_url);
      const seen = new Map();
      ws.on('message', (d) => { const m = JSON.parse(d); if (!seen.has(m.type)) seen.set(m.type, m); });
      await once(ws, 'open');
      await new Promise((r) => setTimeout(r, 500));
      return { ws, seen };
    };
    const first = await connect();
    for (const t of ['assetToken', 'loginOk', 'region', 'terrain', 'objects', 'avatars']) assert.ok(first.seen.has(t), t);
    first.ws.close();
    await new Promise((r) => setTimeout(r, 200));
    const second = await connect();
    assert.ok(second.seen.has('objects') && second.seen.get('objects').upsert.length > 10);
    second.ws.close();
    const bad = new WebSocket(`ws://localhost:${port}/stream?session=nope`);
    const [code] = await once(bad, 'close');
    assert.equal(code, 4001);
  } finally {
    proc.kill();
  }
});
