import nmv from '@caspertech/node-metaverse';

const { PCode } = nmv;

const r3 = (n) => Math.round((n ?? 0) * 1000) / 1000;
const vec = (v, d = [0, 0, 0]) => (v ? [r3(v.x), r3(v.y), r3(v.z)] : d);
const quat = (q) => (q ? [r3(q.x), r3(q.y), r3(q.z), r3(q.w)] : [0, 0, 0, 1]);

function face(f) {
  if (!f) return null;
  const c = f.rgba;
  return {
    tex: f.textureID?.toString(),
    color: c ? [r3(c.red), r3(c.green), r3(c.blue), r3(c.alpha)] : [1, 1, 1, 1],
    rep: [r3(f.repeatU), r3(f.repeatV)],
    off: [r3(f.offsetU), r3(f.offsetV)],
    rot: r3(f.rotation),
    glow: r3(f.glow),
    fullbright: Boolean(f.material & 0x20),
  };
}

function textureEntry(te) {
  if (!te) return null;
  return { def: face(te.defaultTexture), faces: te.faces.map(face) };
}

function avatarName(obj) {
  const first = obj.NameValue?.get('FirstName')?.value ?? '';
  const last = obj.NameValue?.get('LastName')?.value ?? '';
  return `${first} ${last === 'Resident' ? '' : last}`.trim();
}

export function serializeObject(obj) {
  const out = {
    id: obj.ID,
    uuid: obj.FullID?.toString(),
    parent: obj.ParentID ?? 0,
    pcode: obj.PCode,
    pos: vec(obj.Position),
    rot: quat(obj.Rotation),
    scale: vec(obj.Scale, [1, 1, 1]),
  };
  if (obj.PCode === PCode.Avatar) {
    out.name = avatarName(obj);
    return out;
  }
  if (obj.PCode === PCode.Prim) {
    out.shape = {
      pathCurve: obj.PathCurve ?? 16,
      profileCurve: obj.ProfileCurve ?? 1,
      pathBegin: r3(obj.PathBegin),
      pathEnd: r3(obj.PathEnd ?? 1),
      pathScale: [r3(obj.PathScaleX ?? 1), r3(obj.PathScaleY ?? 1)],
      pathShear: [r3(obj.PathShearX), r3(obj.PathShearY)],
      pathTwist: r3(obj.PathTwist),
      pathTwistBegin: r3(obj.PathTwistBegin),
      pathRadiusOffset: r3(obj.PathRadiusOffset),
      pathTaper: [r3(obj.PathTaperX), r3(obj.PathTaperY)],
      pathRevolutions: r3(obj.PathRevolutions ?? 1),
      pathSkew: r3(obj.PathSkew),
      profileBegin: r3(obj.ProfileBegin),
      profileEnd: r3(obj.ProfileEnd ?? 1),
      profileHollow: r3(obj.ProfileHollow),
    };
    out.te = textureEntry(obj.TextureEntry);
    const ep = obj.extraParams;
    if (ep?.meshData) out.mesh = { uuid: ep.meshData.meshData.toString(), type: ep.meshData.type };
    else if (ep?.sculptData) out.sculpt = { uuid: ep.sculptData.texture.toString(), type: ep.sculptData.type };
    if (ep?.lightData) {
      const l = ep.lightData;
      out.light = { color: l.Color ? [l.Color.red, l.Color.green, l.Color.blue] : [1, 1, 1], radius: l.Radius, intensity: l.Intensity, falloff: l.Falloff };
    }
    if (obj.Text) {
      const c = obj.TextColor;
      out.text = { value: obj.Text, color: c ? [c.red, c.green, c.blue, c.alpha] : [1, 1, 1, 1] };
    }
  }
  if (obj.IsAttachment) out.attachment = obj.attachmentPoint ?? 0;
  return out;
}

export function terrainToFloat32(region) {
  const size = 256;
  const heights = new Float32Array(size * size);
  if (!region.terrain) return heights;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const p = region.terrain[(y >> 4) * 16 + (x >> 4)];
      heights[y * size + x] = p ? p[(y & 15) * 16 + (x & 15)] : 0;
    }
  }
  return heights;
}
