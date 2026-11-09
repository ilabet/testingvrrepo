import http from 'node:http';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer } from 'ws';
import { DemoSession } from './demo.js';
import { getTexture, getMesh } from './assets.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8080);
const CLIENT_DIR = process.env.CLIENT_DIR ?? path.resolve(here, '../client');
// Built React app (the root Dockerfile copies it here); without it the standalone viewer is served at /.
const WEB_DIR = process.env.WEB_DIR ?? path.resolve(here, '../web');
const HAS_WEB = existsSync(path.join(WEB_DIR, 'index.html'));
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL ?? '';
const ALERT_MIN_INTERVAL_MS = 60000;
const DEMO_ONLY = process.env.DEMO_ONLY === '1';
const ALLOW_CUSTOM_GRIDS = process.env.ALLOW_CUSTOM_GRIDS === '1';
const MAX_SESSIONS = Number(process.env.MAX_SESSIONS ?? 20);
const PROXY_TOKEN = process.env.PROXY_TOKEN ?? '';
const DETACHED_TIMEOUT_MS = Number(process.env.DETACHED_TIMEOUT_MS ?? 120000);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sessions = new Map();

// One Second Life (or demo) session, which a viewer WebSocket can attach to and re-attach to.
class HostedSession {
  constructor({ persistent }) {
    this.token = randomBytes(16).toString('hex');
    this.persistent = persistent;
    this.ws = null;
    this.session = null;
    this.loginOk = null;
    this.loginError = null;
    this.regionName = null;
    this.timer = null;
    this.send = (msg) => {
      if (msg.type === 'loginOk') this.loginOk = msg;
      if (msg.type === 'loginError') this.loginError = msg;
      if (msg.type === 'region') this.regionName = msg.name;
      if (msg.type === 'disconnected') setImmediate(() => this.close());
      if (this.ws && this.ws.readyState === this.ws.OPEN) this.ws.send(JSON.stringify(msg));
    };
    sessions.set(this.token, this);
  }

  async login(params) {
    const demo = DEMO_ONLY || params.mode === 'demo' || params.grid === 'demo';
    if (demo) this.session = new DemoSession(this.send);
    else {
      const { SLSession } = await import('./session.js');
      this.session = new SLSession(this.send, { allowCustomGrids: ALLOW_CUSTOM_GRIDS });
    }
    this.demo = demo;
    await this.session.login(params);
    if (!this.loginOk) this.close();
    return this.loginOk;
  }

  attach(ws) {
    if (this.ws && this.ws !== ws) this.ws.close(4000, 'Replaced by a new connection');
    clearTimeout(this.timer);
    this.ws = ws;
    this.send({ type: 'assetToken', token: this.token });
    if (this.loginOk) {
      this.send(this.loginOk);
      this.session?.resync?.();
    }
  }

  detach(ws) {
    if (this.ws !== ws) return;
    this.ws = null;
    if (!this.persistent) { this.close(); return; }
    this.timer = setTimeout(() => this.close(), DETACHED_TIMEOUT_MS);
  }

  async handle(msg) {
    if (!this.session || !this.loginOk) return;
    try { await this.session.handle(msg); } catch (err) { this.send({ type: 'error', message: err?.message ?? 'Command failed' }); }
  }

  close() {
    if (!sessions.has(this.token)) return;
    sessions.delete(this.token);
    clearTimeout(this.timer);
    this.session?.close();
    this.session = null;
    this.ws?.close();
  }
}

function publicUrl(req) {
  const proto = req.headers['x-forwarded-proto']?.split(',')[0] || (req.socket.encrypted ? 'https' : 'http');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, x-proxy-token');
  res.set('Access-Control-Expose-Headers', 'X-Alpha-Mode');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const health = (_req, res) => res.json({ ok: true, service: 'secondlife-go-backend', sessions: sessions.size, demoOnly: DEMO_ONLY, uptime: Math.round(process.uptime()) });
app.get('/health', health);
app.get('/healthz', health);
app.get('/config', (_req, res) => res.json({ demoOnly: DEMO_ONLY, allowCustomGrids: ALLOW_CUSTOM_GRIDS }));

// HTTP login used by the Base44 app (sl_proxy_connect): logs in, keeps the session alive
// and returns a WebSocket URL the viewer attaches to.
app.post('/login', express.json({ limit: '16kb' }), async (req, res) => {
  if (PROXY_TOKEN && req.get('x-proxy-token') !== PROXY_TOKEN) return res.status(401).json({ success: false, message: 'Unauthorized' });
  const body = req.body ?? {};
  const first = String(body.first_name || body.first || '').trim();
  const last = String(body.last_name || body.last || 'Resident').trim();
  const grid = body.custom_login_uri && body.grid === 'custom' ? body.custom_login_uri : body.grid || 'agni';
  const demo = DEMO_ONLY || grid === 'demo';
  if (!demo && (!first || !body.password)) return res.status(400).json({ success: false, message: 'Missing credentials' });
  if (sessions.size >= MAX_SESSIONS) return res.status(503).json({ success: false, message: 'Bridge is at capacity' });

  const hosted = new HostedSession({ persistent: true });
  try {
    const ok = await hosted.login({ username: `${first || 'Demo'} ${last}`, password: body.password, grid, start: body.start || 'last' });
    if (!ok) return res.json({ success: false, message: hosted.loginError?.message || 'Login failed', mfa: Boolean(hosted.loginError?.mfa) });
    hosted.timer = setTimeout(() => hosted.close(), DETACHED_TIMEOUT_MS);
    const wsUrl = `${publicUrl(req).replace(/^http/, 'ws')}/stream?session=${hosted.token}`;
    return res.json({
      success: true,
      ws_url: wsUrl,
      agent_id: ok.agent.id,
      avatar_name: ok.agent.name,
      first_name: first,
      last_name: last,
      region: hosted.regionName || '',
      demo: hosted.demo,
      message: ok.message,
    });
  } catch (err) {
    hosted.close();
    return res.status(500).json({ success: false, message: err?.message || 'Login bridge error' });
  }
});

function assetRoute(kind, loader) {
  app.get(`/asset/${kind}/:token/:uuid`, async (req, res) => {
    const hosted = sessions.get(req.params.token);
    if (!hosted?.session || !UUID_RE.test(req.params.uuid)) return res.sendStatus(404);
    try {
      const result = await loader(hosted.session, req.params.uuid.toLowerCase());
      res.set('Cache-Control', 'private, max-age=86400');
      if (kind === 'texture') {
        res.set('X-Alpha-Mode', result.alpha);
        res.type('image/webp').send(result.data);
      } else res.json(result);
    } catch {
      res.sendStatus(404);
    }
  });
}
assetRoute('texture', getTexture);
assetRoute('mesh', getMesh);

app.use('/vendor/three', express.static(path.resolve(here, '../node_modules/three'), { maxAge: '7d' }));
// Discord ping when a viewer's world stream drops (the viewer reports it; one alert a minute at most).
let lastAlertAt = 0;
app.post('/alert/stream-drop', express.json({ limit: '4kb' }), async (req, res) => {
  if (!DISCORD_WEBHOOK_URL) return res.status(204).end();
  const now = Date.now();
  if (now - lastAlertAt < ALERT_MIN_INTERVAL_MS) return res.status(429).json({ success: false, message: 'Alert rate limited' });
  lastAlertAt = now;
  const reason = typeof req.body?.reason === 'string' && req.body.reason ? req.body.reason.slice(0, 300) : 'connection lost';
  const content = ['**World stream dropped**', `**Bridge:** ${publicUrl(req)}`, `**Reason:** ${reason}`, `**When:** ${new Date().toISOString()}`].join('\n');
  try {
    const r = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'SecondLife Go', content }),
      signal: AbortSignal.timeout(10000),
    });
    return r.ok ? res.json({ success: true }) : res.status(502).json({ success: false, message: `Discord responded ${r.status}` });
  } catch {
    return res.status(502).json({ success: false, message: 'Could not reach Discord' });
  }
});

if (HAS_WEB) {
  app.use('/standalone', express.static(CLIENT_DIR, { extensions: ['html'] }));
  app.use(express.static(WEB_DIR, { index: false, maxAge: '1h' }));
  // client-side routes (/sl-login, /mobile, ...) all load the app shell
  app.use((req, res, next) => (req.method === 'GET' && req.accepts('html') ? res.sendFile(path.join(WEB_DIR, 'index.html')) : next()));
} else {
  app.use(express.static(CLIENT_DIR, { extensions: ['html'] }));
}

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname !== '/ws' && url.pathname !== '/stream') return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => onConnection(ws, url));
});

function onConnection(ws, url) {
  const send = (msg) => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg)); };
  let hosted = null;
  let busy = false;

  if (url.pathname === '/stream') {
    hosted = sessions.get(url.searchParams.get('session') ?? '');
    if (!hosted) {
      send({ type: 'disconnected', message: 'Session expired. Please log in again.' });
      ws.close(4001, 'Unknown session');
      return;
    }
    hosted.attach(ws);
  }

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type === 'ping') { send({ type: 'pong', t: msg.t }); return; }
    if (msg.type === 'logout') { hosted?.close(); ws.close(); return; }
    if (msg.type === 'login') {
      if (hosted || busy) return;
      if (sessions.size >= MAX_SESSIONS) { send({ type: 'loginError', reason: 'busy', message: 'Bridge is at capacity' }); return; }
      busy = true;
      const h = new HostedSession({ persistent: false });
      h.attach(ws);
      try {
        if (await h.login(msg)) hosted = h;
      } catch (err) {
        h.close();
        send({ type: 'loginError', reason: 'error', message: err?.message ?? 'Login failed' });
      } finally {
        busy = false;
      }
      return;
    }
    await hosted?.handle(msg);
  });

  ws.on('close', () => hosted?.detach(ws));
}

server.listen(PORT, () => console.log(`SecondLife Go backend listening on :${PORT}${DEMO_ONLY ? ' (demo only)' : ''}`));

const shutdown = () => {
  for (const h of [...sessions.values()]) h.close();
  setTimeout(() => process.exit(0), 500);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
