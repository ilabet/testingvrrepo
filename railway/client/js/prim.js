import * as THREE from 'three';

// Approximates Second Life's procedural prim geometry (path + profile extrusion)
// in the prim's unit space [-0.5, 0.5]^3, Z-up. Face indices approximate LL numbering.

const PATH_LINE = 16;
const PATH_CIRCLE = 32;
const PATH_CIRCLE2 = 48;
const PATH_TEST = 64;

const cache = new Map();

function polygon(type) {
  const p = type & 0x0f;
  if (p === 0) return { verts: circle(24), smooth: true };
  if (p === 1) return { verts: [[0.5, -0.5], [0.5, 0.5], [-0.5, 0.5], [-0.5, -0.5]], smooth: false };
  if (p === 5) return { verts: halfCircle(12), smooth: true, half: true };
  return { verts: [[0.5, -0.5], [0, 0.5], [-0.5, -0.5]], smooth: false };
}

function circle(n) {
  const out = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; out.push([0.5 * Math.cos(a), 0.5 * Math.sin(a)]); }
  return out;
}

function halfCircle(n) {
  const out = [];
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI; out.push([0.5 * Math.cos(a), 0.5 * Math.sin(a)]); }
  return out;
}

function holePolygon(profileCurve, outer) {
  const hole = profileCurve & 0xf0;
  if (hole === 0x10) return { verts: circle(24), smooth: true };
  if (hole === 0x20) return polygon(1);
  if (hole === 0x30) return polygon(3);
  return outer;
}

// Returns points along a closed polygon between perimeter fractions t0..t1, each tagged with edge index.
function cutLoop(verts, t0, t1, closed = true) {
  const n = closed ? verts.length : verts.length - 1;
  const at = (t) => {
    const f = Math.min(n - 1e-9, Math.max(0, t * n));
    const i = Math.floor(f), k = f - i;
    const a = verts[i], b = verts[(i + 1) % verts.length];
    return { p: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], edge: i };
  };
  const pts = [at(t0)];
  for (let i = Math.floor(t0 * n) + 1; i < t1 * n - 1e-9; i++) pts.push({ p: verts[i % verts.length], edge: i % n, corner: true });
  const end = at(t1);
  if (t1 >= 1 && closed) end.p = verts[0];
  end.edge = pts[pts.length - 1].edge;
  pts.push(end);
  return pts;
}

function splitByEdge(pts, smooth) {
  if (smooth) return [{ edge: 0, pts: pts.map((x) => x.p) }];
  const chains = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const e = pts[i + 1].corner ? pts[i].edge : pts[i].edge;
    const last = chains[chains.length - 1];
    if (last && last.edge === e) last.pts.push(pts[i + 1].p);
    else chains.push({ edge: e, pts: [pts[i].p, pts[i + 1].p] });
  }
  return chains;
}

function pathFrames(s) {
  const curve = s.pathCurve;
  const frames = [];
  if (curve === PATH_CIRCLE || curve === PATH_CIRCLE2 || curve === PATH_TEST) {
    const rev = Math.max(1, s.pathRevolutions || 1);
    const holeX = s.pathScale[0] || 1;
    const holeY = s.pathScale[1] || 1;
    const t0 = s.pathBegin, t1 = s.pathEnd;
    const steps = Math.max(3, Math.ceil(36 * (t1 - t0) * rev));
    for (let k = 0; k <= steps; k++) {
      const t = t0 + ((t1 - t0) * k) / steps;
      const a = t * Math.PI * 2 * rev;
      const twist = (s.pathTwistBegin + (s.pathTwist - s.pathTwistBegin) * (k / steps)) * Math.PI;
      const taperX = 1 - Math.abs(s.pathTaper[0]) * (s.pathTaper[0] > 0 ? k / steps : 1 - k / steps);
      const taperY = 1 - Math.abs(s.pathTaper[1]) * (s.pathTaper[1] > 0 ? k / steps : 1 - k / steps);
      const rBase = 0.5 - 0.5 * holeY + (s.pathRadiusOffset || 0) * 0.5;
      const screw = rev > 1 ? (t - 0.5) * (1 - holeX) : 0;
      frames.push({
        v: k / steps,
        map([u, v]) {
          const cu = Math.cos(twist), su = Math.sin(twist);
          const ru = (u * cu - v * su) * holeX * taperX;
          const rv = (u * su + v * cu) * holeY * taperY;
          const r = rBase + rv;
          return [ru + screw + (s.pathSkew || 0) * (t - 0.5), r * Math.cos(a), r * Math.sin(a)];
        },
      });
    }
    return { frames, closed: t1 - t0 >= 0.999 && rev === 1 };
  }
  const sx = s.pathScale[0], sy = s.pathScale[1];
  const top = [1 - sx > 0 ? sx : 1, 1 - sy > 0 ? sy : 1];
  const bot = [1 - sx < 0 ? 2 - sx : 1, 1 - sy < 0 ? 2 - sy : 1];
  const twistSpan = Math.abs(s.pathTwist - s.pathTwistBegin);
  const steps = twistSpan > 0 ? Math.max(4, Math.ceil(twistSpan * 12)) : 1;
  for (let k = 0; k <= steps; k++) {
    const t = s.pathBegin + ((s.pathEnd - s.pathBegin) * k) / steps;
    const scx = bot[0] + (top[0] - bot[0]) * t, scy = bot[1] + (top[1] - bot[1]) * t;
    const tw = (s.pathTwistBegin + (s.pathTwist - s.pathTwistBegin) * t) * Math.PI;
    const c = Math.cos(tw), sn = Math.sin(tw);
    frames.push({
      v: k / steps,
      map([x, y]) {
        const px = x * scx, py = y * scy;
        return [px * c - py * sn + s.pathShear[0] * (t - 0.5), px * sn + py * c + s.pathShear[1] * (t - 0.5), t - 0.5];
      },
    });
  }
  return { frames, closed: false };
}

export function buildPrimGeometry(shape) {
  const key = JSON.stringify(shape);
  if (cache.has(key)) return cache.get(key);
  const geo = generate(shape);
  cache.set(key, geo);
  return geo;
}

function generate(s) {
  const outer = polygon(s.profileCurve);
  const pb = Math.max(0, Math.min(1, s.profileBegin)), pe = Math.max(pb + 0.02, Math.min(1, s.profileEnd));
  const cut = pb > 0.001 || pe < 0.999 || outer.half;
  const hollow = Math.min(0.95, s.profileHollow || 0);
  const outerPts = cutLoop(outer.verts, pb, pe, !outer.half);
  const innerPoly = holePolygon(s.profileCurve, outer);
  const innerPts = hollow > 0 ? cutLoop(innerPoly.verts, pb, pe, !outer.half).map((x) => ({ ...x, p: [x.p[0] * hollow, x.p[1] * hollow] })) : null;

  const { frames, closed: pathClosed } = pathFrames(s);
  const positions = [], uvs = [], indices = [];
  const groups = [];
  const nOuterFaces = outer.smooth ? 1 : outer.verts.length;
  let faceCounter = 1 + nOuterFaces;

  const strip = (chain, face) => {
    const start = indices.length;
    const base = positions.length / 3;
    const lens = [0];
    for (let i = 1; i < chain.length; i++) lens.push(lens[i - 1] + Math.hypot(chain[i][0] - chain[i - 1][0], chain[i][1] - chain[i - 1][1]));
    const total = lens[lens.length - 1] || 1;
    for (const f of frames) {
      chain.forEach((p, i) => { positions.push(...f.map(p)); uvs.push(lens[i] / total, f.v); });
    }
    const w = chain.length;
    for (let k = 0; k < frames.length - 1; k++) {
      for (let i = 0; i < w - 1; i++) {
        const a = base + k * w + i, b = a + 1, c = a + w, d = c + 1;
        indices.push(a, b, d, a, d, c);
      }
    }
    groups.push({ start, count: indices.length - start, face });
  };

  for (const ch of splitByEdge(outerPts, outer.smooth)) strip(ch.pts, 1 + (outer.smooth ? 0 : ch.edge));
  if (innerPts) strip(innerPts.map((x) => x.p).reverse(), faceCounter++);
  let section;
  if (cut) {
    const first = outerPts[0].p, last = outerPts[outerPts.length - 1].p;
    const inFirst = innerPts ? innerPts[0].p : [0, 0];
    const inLast = innerPts ? innerPts[innerPts.length - 1].p : [0, 0];
    strip([last, inLast], faceCounter++);
    strip([inFirst, first], faceCounter++);
    section = { contour: outerPts.map((x) => x.p).concat(innerPts ? innerPts.map((x) => x.p).reverse() : [[0, 0]]), holes: [] };
  } else {
    section = { contour: outerPts.slice(0, -1).map((x) => x.p), holes: innerPts ? [innerPts.slice(0, -1).map((x) => x.p)] : [] };
  }

  if (!pathClosed) {
    const tris = THREE.ShapeUtils.triangulateShape(
      section.contour.map(([x, y]) => new THREE.Vector2(x, y)),
      section.holes.map((h) => h.map(([x, y]) => new THREE.Vector2(x, y))),
    );
    const all = section.contour.concat(...section.holes);
    const cap = (frame, face, flip) => {
      const start = indices.length;
      const base = positions.length / 3;
      for (const p of all) { positions.push(...frame.map(p)); uvs.push(p[0] + 0.5, p[1] + 0.5); }
      for (const [a, b, c] of tris) indices.push(base + a, base + (flip ? c : b), base + (flip ? b : c));
      groups.push({ start, count: indices.length - start, face });
    };
    cap(frames[frames.length - 1], 0, false);
    cap(frames[0], faceCounter++, true);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  for (const g of groups) geo.addGroup(g.start, g.count, g.face);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  geo.userData.faceCount = faceCounter;
  return geo;
}
