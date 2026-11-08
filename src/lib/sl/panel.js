import * as THREE from 'three';

const W = 1024, H = 768;
const KEYS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '/'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '?', '!'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', "'", ',', '.'],
  ['SHIFT', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '@', ':', 'DEL', 'DEL'],
  ['CLEAR', 'SPACE', 'SPACE', 'SPACE', 'SPACE', 'SPACE', 'SPACE', 'SPACE', 'SPACE', 'SEND', 'SEND', 'SEND'],
];

// In-VR wrist panel drawn to a canvas: chat log, teleport tools, notifications and a virtual keyboard.
export class VRPanel {
  constructor(handlers, width = 0.42) {
    this.h = handlers;
    this.canvas = document.createElement('canvas');
    this.canvas.width = W; this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, (width * H) / W),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, side: THREE.DoubleSide, depthTest: false, toneMapped: false }),
    );
    this.mesh.renderOrder = 30;
    this.mesh.userData.panel = this;
    this.tab = 'chat';
    this.log = [];
    this.notices = [];
    this.text = '';
    this.shift = false;
    this.target = { kind: 'chat' };
    this.flags = { fly: false, run: false, sitting: false };
    this.status = '';
    this.hoverPt = null;
    this.buttons = [];
    this.dirty = true;
  }

  addChat(line, color = '#fff') { this.log.push({ line, color }); if (this.log.length > 200) this.log.shift(); this.dirty = true; }
  addNotice(n) { this.notices.unshift(n); this.notices = this.notices.slice(0, 20); this.alertIndex = 0; this.dirty = true; }
  removeNotice(id) { this.notices = this.notices.filter((n) => n.id !== id); this.dirty = true; }
  setFlags(f) { this.flags = { ...this.flags, ...f }; this.dirty = true; }
  setStatus(s) { this.status = s; this.dirty = true; }

  button(x, y, w, h, label, onClick, { active = false, color = '#2d3748' } = {}) {
    const ctx = this.ctx;
    const hover = this.hoverPt && this.hoverPt[0] >= x && this.hoverPt[0] <= x + w && this.hoverPt[1] >= y && this.hoverPt[1] <= y + h;
    ctx.fillStyle = active ? '#3182ce' : hover ? '#4a5568' : color;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `${Math.min(30, h * 0.5)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2, w - 8);
    this.buttons.push({ x, y, w, h, onClick });
  }

  redraw() {
    const ctx = this.ctx;
    this.buttons = [];
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(15,20,30,0.92)';
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, 24); ctx.fill();
    const tabs = [['chat', 'Chat'], ['travel', 'Travel'], ['alerts', `Alerts${this.notices.length ? ` (${this.notices.length})` : ''}`]];
    tabs.forEach(([id, label], i) => this.button(12 + i * 210, 10, 200, 56, label, () => { this.tab = id; }, { active: this.tab === id }));
    ctx.fillStyle = '#a0aec0'; ctx.font = '24px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(this.status, W - 20, 38, 360);
    if (this.tab === 'chat') this.drawChat();
    else if (this.tab === 'travel') this.drawTravel();
    else this.drawAlerts();
    this.drawInput();
    this.drawKeyboard();
    this.texture.needsUpdate = true;
    this.dirty = false;
  }

  drawChat() {
    const ctx = this.ctx;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = '26px sans-serif';
    const lines = [];
    for (const { line, color } of this.log.slice(-30)) for (const l of wrap(ctx, line, W - 48)) lines.push({ l, color });
    lines.slice(-8).forEach(({ l, color }, i) => { ctx.fillStyle = color; ctx.fillText(l, 24, 80 + i * 32); });
  }

  drawTravel() {
    const ctx = this.ctx;
    this.button(24, 84, 230, 60, 'Teleport Home', () => this.h.onHome());
    this.button(266, 84, 230, 60, this.flags.fly ? 'Stop flying' : 'Fly', () => this.h.onToggleFly(), { active: this.flags.fly });
    this.button(508, 84, 230, 60, this.flags.run ? 'Walk' : 'Run', () => this.h.onToggleRun(), { active: this.flags.run });
    this.button(750, 84, 250, 60, 'Stand up', () => this.h.onStand(), { active: this.flags.sitting });
    this.button(24, 160, 480, 60, 'Type region name below', () => { this.target = { kind: 'region' }; this.text = ''; }, { active: this.target.kind === 'region' });
    this.button(520, 160, 230, 60, 'Snap turn: ' + (this.h.getSnap?.() ? 'on' : 'off'), () => this.h.onToggleSnap?.());
    ctx.fillStyle = '#a0aec0'; ctx.font = '22px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('Left stick: move (push to edge = run)   Right stick: turn   A/X: jump, double-tap = fly', 24, 236);
    ctx.fillText('Flying: hold A up, X down   Trigger: interact   Grip: sit   Move or jump: stand   B/Y: menu', 24, 266);
  }

  drawAlerts() {
    const ctx = this.ctx;
    if (!this.notices.length) { ctx.fillStyle = '#a0aec0'; ctx.font = '26px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('No notifications', 24, 90); }
    if (!this.notices.length) return;
    // One alert at a time, with paging, so every alert and every dialog choice stays reachable.
    this.alertIndex = Math.min(this.alertIndex ?? 0, this.notices.length - 1);
    const n = this.notices[this.alertIndex];
    ctx.fillStyle = '#e2e8f0'; ctx.font = '24px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    wrap(ctx, n.title, W - 48).slice(0, 2).forEach((line, i) => ctx.fillText(line, 24, 80 + i * 30));
    const perRow = Math.min(7, n.buttons.length);
    const bw = Math.min(220, (W - 48) / perRow - 8);
    n.buttons.forEach((b, i) => {
      const col = i % perRow, row = Math.floor(i / perRow);
      this.button(24 + col * (bw + 8), 148 + row * 52, bw, 44, b.label, () => { b.onClick(); this.removeNotice(n.id); });
    });
    if (this.notices.length > 1) {
      ctx.fillStyle = '#a0aec0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`${this.alertIndex + 1} / ${this.notices.length}`, W / 2, 278);
      this.button(W / 2 - 200, 254, 120, 48, '< Newer', () => { this.alertIndex = Math.max(0, this.alertIndex - 1); });
      this.button(W / 2 + 80, 254, 120, 48, 'Older >', () => { this.alertIndex = Math.min(this.notices.length - 1, this.alertIndex + 1); });
    }
  }

  drawInput() {
    const ctx = this.ctx;
    ctx.fillStyle = '#1a202c'; ctx.beginPath(); ctx.roundRect(16, 344, W - 32, 52, 10); ctx.fill();
    const prefix = this.target.kind === 'region' ? 'Region: ' : this.target.kind === 'im' ? `IM ${this.target.name}: ` : 'Say: ';
    ctx.fillStyle = '#90cdf4'; ctx.font = '26px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(prefix + this.text.slice(-60) + '|', 28, 370, W - 56);
  }

  drawKeyboard() {
    const kw = (W - 32) / 12, kh = 68;
    KEYS.forEach((row, r) => {
      let c = 0;
      while (c < row.length) {
        const key = row[c];
        let span = 1;
        while (c + span < row.length && row[c + span] === key && key.length > 1) span++;
        const label = key === 'SHIFT' ? 'Shift' : key === 'DEL' ? 'Del' : key === 'SPACE' ? 'Space' : key === 'SEND' ? 'Send' : key === 'CLEAR' ? 'Clear' : this.shift ? key.toUpperCase() : key;
        this.button(16 + c * kw + 3, 404 + r * (kh + 4), kw * span - 6, kh, label, () => this.press(key), { active: key === 'SHIFT' && this.shift, color: key === 'SEND' ? '#2f855a' : '#2d3748' });
        c += span;
      }
    });
  }

  press(key) {
    if (key === 'SHIFT') this.shift = !this.shift;
    else if (key === 'DEL') this.text = this.text.slice(0, -1);
    else if (key === 'CLEAR') { this.text = ''; this.target = { kind: 'chat' }; }
    else if (key === 'SPACE') this.text += ' ';
    else if (key === 'SEND') this.submit();
    else { this.text += this.shift ? key.toUpperCase() : key; this.shift = false; }
  }

  submit() {
    const text = this.text.trim();
    if (!text) return;
    if (this.target.kind === 'region') this.h.onTeleport(text);
    else if (this.target.kind === 'im') this.h.onIM(this.target.id, text);
    else this.h.onChat(text);
    this.text = '';
    if (this.target.kind === 'region') this.target = { kind: 'chat' };
  }

  replyTo(id, name) { this.target = { kind: 'im', id, name }; this.tab = 'chat'; this.text = ''; this.dirty = true; }

  toPixels(uv) { return [uv.x * W, (1 - uv.y) * H]; }
  hover(uv) { const p = uv ? this.toPixels(uv) : null; if (String(p) !== String(this.hoverPt)) { this.hoverPt = p; this.dirty = true; } }
  click(uv) {
    const [x, y] = this.toPixels(uv);
    const b = this.buttons.find((bt) => x >= bt.x && x <= bt.x + bt.w && y >= bt.y && y <= bt.y + bt.h);
    if (b) { b.onClick(); this.dirty = true; }
  }
  update() { if (this.dirty) this.redraw(); }
}

function wrap(ctx, text, max) {
  const words = String(text).split(' ');
  const out = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > max && cur) { out.push(cur); cur = w; } else cur = t;
  }
  if (cur) out.push(cur);
  return out.length ? out : [''];
}
