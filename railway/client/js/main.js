import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { World, AV_OFFSET, slToThree } from './world.js';
import { VRPanel } from './panel.js';

const $ = (id) => document.getElementById(id);
const DEADZONE = 0.25;
const SNAP_ANGLE = Math.PI / 6;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
renderer.xr.setFoveation(1);
$('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9cc9f0);
scene.fog = new THREE.Fog(0x9cc9f0, 80, 320);
scene.add(new THREE.HemisphereLight(0xdfefff, 0x4a5a3a, 1.2));
const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
sun.position.set(0.4, 1, 0.3);
scene.add(sun);

const rig = new THREE.Group();
scene.add(rig);
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 512);
camera.position.y = 1.6;
rig.add(camera);

const world = new World(scene);
const state = {
  ws: null, selfId: null, selfName: '', serverPos: null, predicted: null, sitting: false,
  fly: false, run: false, snap: true, keys: new Set(), pitch: 0, lastSent: null, lastSentAt: 0, connected: false,
};

const panel = new VRPanel({
  onChat: (text) => sendChat(text),
  onIM: (to, text) => { send({ type: 'im', to, text }); log(`[IM to] ${text}`, '#fbd38d'); },
  onTeleport: (text) => teleport(text),
  onHome: () => send({ type: 'home' }),
  onStand: () => send({ type: 'stand' }),
  onToggleFly: () => setFly(!state.fly),
  onToggleRun: () => setRun(!state.run),
  onToggleSnap: () => { state.snap = !state.snap; },
  getSnap: () => state.snap,
});
panel.mesh.visible = false;

// ---------- networking ----------
function send(msg) { if (state.ws?.readyState === WebSocket.OPEN) state.ws.send(JSON.stringify(msg)); }

function connect(loginMsg) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/ws`);
  state.ws = ws;
  ws.onopen = () => ws.send(JSON.stringify(loginMsg));
  ws.onmessage = (ev) => handle(JSON.parse(ev.data));
  ws.onclose = () => {
    if (state.ws !== ws) return;
    state.ws = null;
    if (state.connected) showLogin('Disconnected from bridge.');
    else setLoginBusy(false, 'Could not reach the bridge.');
    state.connected = false;
  };
}

function handle(m) {
  switch (m.type) {
    case 'assetToken': world.setToken(m.token); break;
    case 'loginOk':
      state.connected = true;
      state.selfId = m.agent.id;
      state.selfName = m.agent.name;
      $('login').hidden = true;
      $('hud').hidden = false;
      log(m.message || `Logged in as ${m.agent.name}`, '#9ae6b4');
      setStatus(m.demo ? 'Demo mode' : 'Connected');
      break;
    case 'loginError':
      setLoginBusy(false, m.message || 'Login failed');
      if (m.mfa) $('mfaRow').hidden = false;
      state.ws?.close();
      break;
    case 'region':
      world.setRegion(m);
      state.predicted = null;
      state.serverPos = null;
      setStatus(m.name);
      log(`Entered region ${m.name}`, '#9ae6b4');
      break;
    case 'terrain': world.setTerrain(m); break;
    case 'objects': world.applyObjects(m); break;
    case 'avatars': {
      world.setAvatars(m.list);
      const self = m.list.find((a) => a.self);
      if (self) {
        state.serverPos = new THREE.Vector3(...self.pos);
        if (self.sitting !== undefined && self.sitting !== state.sitting) { state.sitting = self.sitting; panel.setFlags({ sitting: self.sitting }); }
      }
      $('nearby').textContent = `${m.list.length - (self ? 1 : 0)} nearby`;
      break;
    }
    case 'chat': {
      const text = m.text.startsWith('/me ') ? `${m.from} ${m.text.slice(4)}` : `${m.from}: ${m.text}`;
      log(text, m.sourceType === 2 ? '#b2f5ea' : m.fromId === state.selfId ? '#e2e8f0' : '#fff');
      break;
    }
    case 'im':
      log(`[IM] ${m.from}: ${m.text}`, '#fbd38d');
      notify({ id: `im-${m.fromId}`, title: `IM from ${m.from}: ${m.text}`, buttons: [{ label: 'Reply', onClick: () => replyIM(m.fromId, m.from) }, { label: 'Dismiss', onClick: () => {} }] });
      break;
    case 'lure':
      notify({ id: m.id, title: `${m.from} offers a teleport: ${m.text || ''}`, buttons: [{ label: 'Accept', onClick: () => send({ type: 'acceptLure', id: m.id }) }, { label: 'Decline', onClick: () => {} }] });
      break;
    case 'dialog':
      notify({ id: m.id, title: `${m.object}: ${m.text}`, buttons: [...m.buttons.map((b, i) => ({ label: b, onClick: () => send({ type: 'dialogReply', id: m.id, index: i }) })), { label: 'Ignore', onClick: () => {} }] });
      break;
    case 'teleport': if (m.message) log(m.message, '#90cdf4'); break;
    case 'disconnected': showLogin(m.message || 'Disconnected from Second Life.'); break;
    case 'error': log(`Error: ${m.message}`, '#feb2b2'); break;
    default: break;
  }
}

function sendChat(text) {
  if (text.startsWith('/shout ')) send({ type: 'chat', text: text.slice(7), mode: 'shout' });
  else if (text.startsWith('/whisper ')) send({ type: 'chat', text: text.slice(9), mode: 'whisper' });
  else {
    const ch = text.match(/^\/(\d+)\s+(.*)$/);
    if (ch) send({ type: 'chat', text: ch[2], channel: Number(ch[1]) });
    else send({ type: 'chat', text });
  }
}

function teleport(text) {
  const [region, x, y, z] = text.split('/').map((s) => s.trim());
  const pos = [Number(x) || 128, Number(y) || 128, Number(z) || 30];
  log(`Teleporting to ${region}...`, '#90cdf4');
  send({ type: 'teleport', region, pos });
}

function replyIM(id, name) {
  panel.replyTo(id, name);
  state.imTarget = { id, name };
  $('chatInput').placeholder = `IM to ${name}`;
  $('chatInput').focus();
}

// ---------- HUD ----------
function log(text, color = '#fff') {
  panel.addChat(text, color);
  const div = document.createElement('div');
  div.textContent = text;
  div.style.color = color;
  const el = $('log');
  el.appendChild(div);
  while (el.childElementCount > 150) el.firstChild.remove();
  el.scrollTop = el.scrollHeight;
}

function notify(n) {
  panel.addNotice(n);
  document.querySelector(`[data-notice="${CSS.escape(n.id)}"]`)?.remove();
  const div = document.createElement('div');
  div.className = 'notice';
  div.dataset.notice = n.id;
  const p = document.createElement('p');
  p.textContent = n.title;
  div.appendChild(p);
  for (const b of n.buttons) {
    const btn = document.createElement('button');
    btn.textContent = b.label;
    btn.onclick = () => { b.onClick(); div.remove(); panel.removeNotice(n.id); };
    div.appendChild(btn);
  }
  $('notices').appendChild(div);
}

function setStatus(s) { $('status').textContent = s; panel.setStatus(s); }
function setFly(v) { state.fly = v; panel.setFlags({ fly: v }); $('flyBtn').classList.toggle('on', v); }
function setRun(v) { state.run = v; panel.setFlags({ run: v }); $('runBtn').classList.toggle('on', v); }

function setLoginBusy(busy, error = '') {
  $('loginBtn').disabled = busy;
  $('demoBtn').disabled = busy;
  $('loginError').textContent = error;
}

function showLogin(message) {
  state.connected = false;
  state.ws?.close();
  world.clear();
  $('hud').hidden = true;
  $('login').hidden = false;
  setLoginBusy(false, message);
  renderer.xr.getSession()?.end();
}

$('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = {
    type: 'login', mode: 'sl', username: $('username').value, password: $('password').value,
    grid: $('grid').value === 'custom' ? $('customGrid').value : $('grid').value,
    start: $('start').value || 'last', mfaToken: $('mfa').value || undefined,
  };
  $('password').value = '';
  $('mfa').value = '';
  setLoginBusy(true, 'Logging in...');
  connect(msg);
});
$('demoBtn').addEventListener('click', () => {
  setLoginBusy(true, 'Starting demo...');
  connect({ type: 'login', mode: 'demo', username: $('username').value || 'Demo Visitor' });
});
$('grid').addEventListener('change', () => { $('customGrid').hidden = $('grid').value !== 'custom'; });
$('chatForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = $('chatInput').value.trim();
  $('chatInput').value = '';
  $('chatInput').blur();
  if (!text) return;
  if (state.imTarget) { panel.h.onIM(state.imTarget.id, text); state.imTarget = null; $('chatInput').placeholder = 'Say something (Enter)'; }
  else if (text.startsWith('/tp ')) teleport(text.slice(4));
  else sendChat(text);
});
$('flyBtn').onclick = () => setFly(!state.fly);
$('runBtn').onclick = () => setRun(!state.run);
$('homeBtn').onclick = () => send({ type: 'home' });
$('standBtn').onclick = () => send({ type: 'stand' });
$('logoutBtn').onclick = () => { send({ type: 'logout' }); showLogin('Logged out.'); };

fetch('/config').then((r) => r.json()).then((cfg) => {
  if (cfg.demoOnly) { $('slFields').hidden = true; $('loginBtn').hidden = true; $('demoNote').hidden = false; }
  if (!cfg.allowCustomGrids) $('grid').querySelector('[value=custom]').remove();
}).catch(() => {});

// ---------- desktop controls ----------
const raycaster = new THREE.Raycaster();
let drag = null;
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'Enter' && !$('hud').hidden) { $('chatInput').focus(); e.preventDefault(); return; }
  if (e.key === 'f' || e.key === 'F') setFly(!state.fly);
  if (e.key === 'Escape') send({ type: 'stand' });
  state.keys.add(e.code);
});
window.addEventListener('keyup', (e) => state.keys.delete(e.code));
renderer.domElement.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; });
window.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.moved += Math.abs(dx) + Math.abs(dy);
  drag.x = e.clientX; drag.y = e.clientY;
  rig.rotation.y -= dx * 0.004;
  state.pitch = Math.max(-1.4, Math.min(1.4, state.pitch - dy * 0.004));
  camera.rotation.x = state.pitch;
});
window.addEventListener('pointerup', (e) => {
  if (drag && drag.moved < 6 && e.target === renderer.domElement) pickAtScreen(e, 'touch');
  drag = null;
});
renderer.domElement.addEventListener('dblclick', (e) => pickAtScreen(e, 'sit'));

function pickAtScreen(e, type) {
  const ndc = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(world.pickables, false)[0];
  if (hit?.object.userData.localId !== undefined) {
    send({ type, id: hit.object.userData.localId });
    if (type === 'touch') log(`Touched ${hit.object.userData.name || 'object'}`, '#a0aec0');
  }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- XR controllers ----------
const modelFactory = new XRControllerModelFactory();
const controllers = [0, 1].map((i) => {
  const ctrl = renderer.xr.getController(i);
  const grip = renderer.xr.getControllerGrip(i);
  grip.add(modelFactory.createControllerModel(grip));
  const ray = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0x90cdf4 }));
  ray.scale.z = 10;
  ctrl.add(ray);
  rig.add(ctrl, grip);
  const c = { ctrl, grip, ray, handedness: null, gamepad: null, prev: [] };
  ctrl.addEventListener('connected', (e) => {
    c.handedness = e.data.handedness;
    c.gamepad = e.data.gamepad;
    if (c.handedness === 'left') {
      grip.add(panel.mesh);
      panel.mesh.position.set(0, 0.07, -0.16);
      panel.mesh.rotation.set(-0.9, 0, 0);
      panel.mesh.visible = true;
    }
  });
  ctrl.addEventListener('disconnected', () => { c.handedness = null; c.gamepad = null; });
  ctrl.addEventListener('selectstart', () => onSelect(c));
  ctrl.addEventListener('squeezestart', () => onSqueeze(c));
  return c;
});

function controllerHit(c, includePanel) {
  raycaster.setFromXRController(c.ctrl);
  const targets = includePanel && panel.mesh.visible ? [panel.mesh, ...world.pickables] : world.pickables;
  return raycaster.intersectObjects(targets, false)[0];
}

function onSelect(c) {
  const hit = controllerHit(c, c.handedness !== 'left');
  if (!hit) return;
  if (hit.object === panel.mesh) panel.click(hit.uv);
  else if (hit.object.userData.localId !== undefined) {
    send({ type: 'touch', id: hit.object.userData.localId });
    log(`Touched ${hit.object.userData.name || 'object'}`, '#a0aec0');
  }
}

function onSqueeze(c) {
  if (state.sitting) { send({ type: 'stand' }); return; }
  const hit = controllerHit(c, false);
  if (hit?.object.userData.localId !== undefined) send({ type: 'sit', id: hit.object.userData.localId });
}

renderer.xr.addEventListener('sessionstart', () => { camera.position.set(0, 0, 0); camera.rotation.set(0, 0, 0); });
renderer.xr.addEventListener('sessionend', () => { camera.position.set(0, 1.6, 0); camera.rotation.set(state.pitch, 0, 0); });

const vrButton = VRButton.createButton(renderer, { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] });
vrButton.id = 'vrButton';
$('hud').appendChild(vrButton);

// ---------- input -> movement ----------
function readInput() {
  const k = state.keys;
  const input = {
    fwd: (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0),
    strafe: (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0),
    up: (k.has('Space') || k.has('KeyE') ? 1 : 0) - (k.has('KeyC') || k.has('KeyQ') ? 1 : 0),
    run: state.run || k.has('ShiftLeft') || k.has('ShiftRight'),
  };
  if (k.has('ArrowLeft')) rig.rotation.y += 0.03;
  if (k.has('ArrowRight')) rig.rotation.y -= 0.03;
  for (const c of controllers) {
    const gp = c.gamepad;
    if (!gp) continue;
    const ax = gp.axes.length >= 4 ? [gp.axes[2], gp.axes[3]] : [gp.axes[0] ?? 0, gp.axes[1] ?? 0];
    const pressed = gp.buttons.map((b) => b.pressed);
    const edge = (i) => pressed[i] && !c.prev[i];
    if (c.handedness === 'left') {
      if (Math.abs(ax[1]) > DEADZONE) input.fwd = -ax[1];
      if (Math.abs(ax[0]) > DEADZONE) input.strafe = ax[0];
      if (pressed[3]) input.run = true;
      if (edge(4)) panel.mesh.visible = !panel.mesh.visible;
      if (edge(5)) setRun(!state.run);
    } else if (c.handedness === 'right') {
      if (state.snap) {
        const turn = ax[0] > 0.7 ? -1 : ax[0] < -0.7 ? 1 : 0;
        if (turn && !c.turned) rotateRig(turn * SNAP_ANGLE);
        c.turned = turn !== 0;
      } else if (Math.abs(ax[0]) > DEADZONE) rotateRig(-ax[0] * 0.03);
      if (state.fly && Math.abs(ax[1]) > DEADZONE) input.up = -ax[1];
      if (pressed[4]) input.up = 1;
      if (edge(5)) setFly(!state.fly);
    }
    c.prev = pressed;
  }
  return input;
}

function rotateRig(angle) {
  const head = new THREE.Vector3();
  camera.getWorldPosition(head);
  rig.position.sub(head).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle).add(head);
  rig.rotation.y += angle;
  state.turnOffset = (state.turnOffset ?? 0);
}

function headingYaw() {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  return Math.atan2(-dir.z, dir.x);
}

function updateMovement(dt) {
  const input = readInput();
  const yaw = headingYaw();
  const q = (v) => (Math.abs(v) > DEADZONE ? Math.sign(v) : 0);
  const cur = { fwd: q(input.fwd), strafe: q(input.strafe), up: q(input.up), fly: state.fly, run: input.run };
  const now = performance.now();
  const changed = !state.lastSent || ['fwd', 'strafe', 'up', 'fly', 'run'].some((key) => state.lastSent[key] !== cur[key]);
  const yawDelta = state.lastSent ? Math.abs(Math.atan2(Math.sin(yaw - state.lastSent.yaw), Math.cos(yaw - state.lastSent.yaw))) : 1;
  if (changed || (yawDelta > 0.08 && now - state.lastSentAt > 150) || now - state.lastSentAt > 2000) {
    send({ type: 'move', ...cur, yaw });
    state.lastSent = { ...cur, yaw };
    state.lastSentAt = now;
  }

  if (!state.serverPos) return;
  if (!state.predicted) state.predicted = state.serverPos.clone();
  const p = state.predicted;
  if (!state.sitting) {
    const speed = state.fly ? 10 : cur.run ? 6 : 3.2;
    p.x += (Math.cos(yaw) * cur.fwd + Math.sin(yaw) * cur.strafe) * speed * dt;
    p.y += (Math.sin(yaw) * cur.fwd - Math.cos(yaw) * cur.strafe) * speed * dt;
    if (state.fly) p.z += cur.up * 6 * dt;
  }
  if (p.distanceTo(state.serverPos) > 4) p.copy(state.serverPos);
  const kxy = 1 - Math.exp(-dt * 2.5), kz = 1 - Math.exp(-dt * 6);
  p.x += (state.serverPos.x - p.x) * kxy;
  p.y += (state.serverPos.y - p.y) * kxy;
  p.z += (state.serverPos.z - p.z) * kz;

  const feet = slToThree([p.x, p.y, p.z - AV_OFFSET]);
  const head = new THREE.Vector3();
  camera.getWorldPosition(head);
  const inXR = renderer.xr.isPresenting;
  // Keep the user's head horizontally over the avatar position, feet on the avatar's floor.
  const offX = inXR ? head.x - rig.position.x : 0;
  const offZ = inXR ? head.z - rig.position.z : 0;
  rig.position.set(feet.x - offX, feet.y, feet.z - offZ);
}

// ---------- render loop ----------
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.1, clock.getDelta());
  if (state.connected) updateMovement(dt);
  world.update(dt);
  for (const c of controllers) {
    if (!c.handedness) continue;
    const hit = controllerHit(c, c.handedness !== 'left');
    c.ray.scale.z = hit ? hit.distance : 10;
    if (c.handedness !== 'left') panel.hover(hit?.object === panel.mesh ? hit.uv : null);
  }
  panel.update();
  renderer.render(scene, camera);
});

setInterval(() => send({ type: 'ping', t: Date.now() }), 10000);
window.__slvr = { state, world, scene, camera, rig };
