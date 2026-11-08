import nmv from '@caspertech/node-metaverse';
import { serializeObject, terrainToFloat32 } from './serialize.js';
import { j2cToWebp, decodeMesh } from './assets.js';

const { Bot, LoginParameters, BotOptionFlags, ControlFlags, AssetType, UUID, Vector3, PCode } = nmv;

export const GRIDS = {
  agni: 'https://login.agni.lindenlab.com/cgi-bin/login.cgi',
  aditi: 'https://login.aditi.lindenlab.com/cgi-bin/login.cgi',
  osgrid: 'http://login.osgrid.org/',
};

const MOVE_FLAGS = ControlFlags.AGENT_CONTROL_AT_POS | ControlFlags.AGENT_CONTROL_AT_NEG
  | ControlFlags.AGENT_CONTROL_LEFT_POS | ControlFlags.AGENT_CONTROL_LEFT_NEG
  | ControlFlags.AGENT_CONTROL_UP_POS | ControlFlags.AGENT_CONTROL_UP_NEG
  | ControlFlags.AGENT_CONTROL_FAST_AT | ControlFlags.AGENT_CONTROL_FAST_LEFT
  | ControlFlags.AGENT_CONTROL_FLY;

export function parseUsername(username) {
  const parts = String(username ?? '').trim().split(/[\s.]+/).filter(Boolean);
  if (parts.length === 0) throw new Error('Username is required');
  return { firstName: parts[0], lastName: parts[1] ?? 'Resident' };
}

export function resolveGrid(grid, allowCustom) {
  if (!grid || GRIDS[grid]) return GRIDS[grid ?? 'agni'];
  if (allowCustom && /^https?:\/\//.test(grid)) return grid;
  throw new Error('Unknown grid');
}

function yawQuat(yaw) {
  return { x: 0, y: 0, z: Math.sin(yaw / 2), w: Math.cos(yaw / 2) };
}

export class SLSession {
  constructor(send, { allowCustomGrids = false } = {}) {
    this.send = send;
    this.allowCustomGrids = allowCustomGrids;
    this.bot = null;
    this.region = null;
    this.dirty = new Set();
    this.removed = new Set();
    this.lures = new Map();
    this.dialogs = new Map();
    this.subs = [];
    this.move = { fwd: 0, strafe: 0, up: 0, yaw: 0, fly: false, run: false };
    this.lastMoveSent = 0;
  }

  async login({ username, password, start = 'last', grid, mfaToken, mfaHash }) {
    const { firstName, lastName } = parseUsername(username);
    const params = new LoginParameters();
    params.firstName = firstName;
    params.lastName = lastName;
    params.password = password;
    params.start = start || 'last';
    params.url = resolveGrid(grid, this.allowCustomGrids);
    if (mfaToken) params.token = mfaToken;
    if (mfaHash) params.mfa_hash = mfaHash;
    params.agreeToTOS = true;
    params.readCritical = true;

    this.bot = new Bot(params, BotOptionFlags.None);
    this.bot.stayPut(false);
    let response;
    try {
      response = await this.bot.login();
    } catch (err) {
      this.bot = null;
      const reason = err?.reason ?? 'error';
      this.send({ type: 'loginError', reason, mfa: reason === 'mfa_challenge', message: err?.message ?? String(err) });
      return;
    }
    await this.bot.connectToSim();
    this.subscribeEvents();
    this.send({
      type: 'loginOk',
      agent: { id: this.bot.agentID().toString(), name: `${firstName} ${lastName}`.replace(/ Resident$/, '') },
      message: response.loginMessage,
      mfaHash: response.mfaHash,
    });
    this.timer = setInterval(() => this.tick(), 100);
    this.tick();
  }

  subscribeEvents() {
    const ev = this.bot.clientEvents;
    this.subs.push(
      ev.onNearbyChat.subscribe((e) => {
        if (!e.message) return;
        this.send({ type: 'chat', from: e.fromName, fromId: e.from?.toString(), chatType: e.chatType, sourceType: e.sourceType, text: e.message });
      }),
      ev.onInstantMessage.subscribe((e) => {
        this.send({ type: 'im', from: e.fromName, fromId: e.from?.toString(), text: e.message });
      }),
      ev.onLure.subscribe((e) => {
        const id = e.lureID.toString();
        this.lures.set(id, e);
        this.send({ type: 'lure', id, from: e.fromName, text: e.lureMessage });
      }),
      ev.onScriptDialog.subscribe((e) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        this.dialogs.set(id, e);
        this.send({ type: 'dialog', id, object: e.ObjectName, text: e.Message, buttons: e.Buttons });
      }),
      ev.onTeleportEvent.subscribe((e) => {
        this.send({ type: 'teleport', state: e.eventType, message: e.message });
      }),
      ev.onDisconnected.subscribe((e) => {
        this.send({ type: 'disconnected', message: e.message });
        this.close();
      }),
    );
  }

  hookRegion(region) {
    this.region = region;
    this.dirty.clear();
    this.removed.clear();
    const store = region.objects;
    const mark = (obj) => { if (obj && obj.ID !== undefined) { this.dirty.add(obj.ID); this.removed.delete(obj.ID); } };
    const origUpdate = store.notifyObjectUpdate.bind(store);
    const origTerse = store.notifyTerseUpdate.bind(store);
    const origDelete = store.deleteObject.bind(store);
    store.notifyObjectUpdate = (isNew, obj) => { mark(obj); return origUpdate(isNew, obj); };
    store.notifyTerseUpdate = (obj) => { mark(obj); return origTerse(obj); };
    store.deleteObject = (id) => { this.dirty.delete(id); this.removed.add(id); return origDelete(id); };

    this.sendRegionState(region);
  }

  resync() {
    if (this.region) this.sendRegionState(this.region);
  }

  sendRegionState(region) {
    this.send({
      type: 'region',
      name: region.regionName,
      size: [region.regionSizeX || 256, region.regionSizeY || 256],
      waterHeight: region.waterHeight ?? 20,
      grid: [region.xCoordinate, region.yCoordinate],
    });
    this.lastAvatars = 0;
    for (const id of region.objects.objects.keys()) this.dirty.add(id);
    const sendTerrain = () => {
      if (this.region !== region) return;
      this.send({ type: 'terrain', size: 256, heights: Buffer.from(terrainToFloat32(region).buffer).toString('base64') });
    };
    region.waitForTerrain().then(sendTerrain).catch(sendTerrain);
  }

  tick() {
    if (!this.bot) return;
    let region;
    try { region = this.bot.currentRegion; } catch { return; }
    if (region && region !== this.region && region.handshakeComplete) this.hookRegion(region);
    if (!this.region) return;

    const store = this.region.objects;
    if (this.dirty.size || this.removed.size) {
      const upsert = [];
      for (const id of this.dirty) {
        const obj = store.objects.get(id);
        if (obj && !obj.deleted) upsert.push(serializeObject(obj));
        if (upsert.length >= 400) break;
      }
      for (const o of upsert) this.dirty.delete(o.id);
      for (const id of this.dirty) if (!store.objects.has(id)) this.dirty.delete(id);
      const remove = [...this.removed];
      this.removed.clear();
      this.send({ type: 'objects', upsert, remove });
    }

    const now = Date.now();
    if (now - (this.lastAvatars ?? 0) > 200) {
      this.lastAvatars = now;
      const selfId = this.bot.agentID().toString();
      const avatars = [];
      for (const [id, av] of this.region.agents) {
        if (!av.isVisible && id !== selfId) continue;
        const p = av.position;
        const r = av.getRotation?.();
        avatars.push({ id, name: `${av.getFirstName()} ${av.getLastName() === 'Resident' ? '' : av.getLastName()}`.trim(), pos: [p.x, p.y, p.z], rot: r ? [r.x, r.y, r.z, r.w] : [0, 0, 0, 1], self: id === selfId });
      }
      this.send({ type: 'avatars', list: avatars });
    }

    const moving = this.move.fwd || this.move.strafe || this.move.up;
    if (moving && now - this.lastMoveSent > 100) this.sendAgentUpdate();
  }

  applyMove(m) {
    this.move = { ...this.move, ...m };
    this.sendAgentUpdate();
  }

  sendAgentUpdate() {
    const agent = this.bot?.agent;
    if (!agent) return;
    const { fwd, strafe, up, yaw, fly, run } = this.move;
    agent.clearControlFlag(MOVE_FLAGS);
    const dz = 0.2;
    if (fwd > dz) agent.setControlFlag(ControlFlags.AGENT_CONTROL_AT_POS);
    if (fwd < -dz) agent.setControlFlag(ControlFlags.AGENT_CONTROL_AT_NEG);
    if (strafe > dz) agent.setControlFlag(ControlFlags.AGENT_CONTROL_LEFT_NEG);
    if (strafe < -dz) agent.setControlFlag(ControlFlags.AGENT_CONTROL_LEFT_POS);
    if (up > dz) agent.setControlFlag(ControlFlags.AGENT_CONTROL_UP_POS);
    if (up < -dz) agent.setControlFlag(ControlFlags.AGENT_CONTROL_UP_NEG);
    if (run && Math.abs(fwd) > dz) agent.setControlFlag(ControlFlags.AGENT_CONTROL_FAST_AT);
    if (fly) agent.setControlFlag(ControlFlags.AGENT_CONTROL_FLY);
    const q = yawQuat(yaw ?? 0);
    Object.assign(agent.bodyRotation, q);
    Object.assign(agent.headRotation, q);
    const self = this.region?.agents.get(this.bot.agentID().toString());
    if (self) {
      const p = self.position;
      const at = new Vector3([Math.cos(yaw), Math.sin(yaw), 0]);
      agent.cameraCenter = new Vector3([p.x, p.y, p.z + 1.6]);
      agent.cameraLookAt = at;
      agent.cameraLeftAxis = new Vector3([-Math.sin(yaw), Math.cos(yaw), 0]);
      agent.cameraUpAxis = new Vector3([0, 0, 1]);
      agent.cameraFar = 128;
    }
    agent.sendAgentUpdate();
    this.lastMoveSent = Date.now();
  }

  async handle(msg) {
    if (!this.bot) return;
    const cc = this.bot.clientCommands;
    switch (msg.type) {
      case 'move': this.applyMove(msg); break;
      case 'chat': {
        const text = String(msg.text ?? '').slice(0, 1023);
        const channel = Number(msg.channel ?? 0);
        if (msg.mode === 'shout') await cc.comms.shout(text, channel);
        else if (msg.mode === 'whisper') await cc.comms.whisper(text, channel);
        else await cc.comms.say(text, channel);
        break;
      }
      case 'im': await cc.comms.sendInstantMessage(msg.to, String(msg.text ?? '').slice(0, 1023)); break;
      case 'teleport': {
        const p = msg.pos ?? [128, 128, 30];
        const ev = await cc.teleport.teleportTo(String(msg.region), new Vector3(p), new Vector3([1, 0, 0]));
        this.send({ type: 'teleport', state: ev.eventType, message: ev.message });
        break;
      }
      case 'home': {
        const home = this.bot.agent.home;
        if (home?.regionHandle) await cc.teleport.teleportToHandle(home.regionHandle, home.position, home.lookAt);
        break;
      }
      case 'acceptLure': {
        const lure = this.lures.get(msg.id);
        if (lure) { this.lures.delete(msg.id); await cc.teleport.acceptTeleport(lure); }
        break;
      }
      case 'dialogReply': {
        const dlg = this.dialogs.get(msg.id);
        if (dlg) { this.dialogs.delete(msg.id); await cc.comms.respondToScriptDialog(dlg, Number(msg.index)); }
        break;
      }
      case 'touch': await cc.region.touchObject(Number(msg.id)); break;
      case 'sit': {
        const obj = this.region?.objects.getObjectByLocalID(Number(msg.id));
        if (obj) await cc.movement.sitOnObject(obj.FullID, new Vector3([0, 0, 0]));
        break;
      }
      case 'stand': cc.movement.stand(); break;
      default: break;
    }
  }

  async loadTexture(uuid) {
    const buf = await this.bot.currentRegion.caps.downloadAsset(new UUID(uuid), AssetType.Texture);
    return j2cToWebp(buf);
  }

  async loadMesh(uuid) {
    const buf = await this.bot.currentRegion.caps.downloadAsset(new UUID(uuid), AssetType.Mesh);
    return decodeMesh(buf);
  }

  async close() {
    clearInterval(this.timer);
    for (const s of this.subs) s.unsubscribe();
    this.subs = [];
    const bot = this.bot;
    this.bot = null;
    if (bot) await bot.close().catch(() => {});
  }
}

export { PCode };
