import * as THREE from "three";
import { World, AV_OFFSET, slToThree } from "./world.js";

const DEADZONE = 0.25;

// Renders the live Second Life region streamed by the Railway bridge and turns
// local input into avatar movement, with client-side prediction.
export function createLiveWorld({ scene, origin, send, onStatus, onEvent }) {
  const world = new World(scene, { origin });
  const state = {
    selfId: null,
    serverPos: null,
    predicted: null,
    sitting: false,
    fly: false,
    run: false,
    region: "",
    lastSent: null,
    lastSentAt: 0,
  };

  const handle = (m) => {
    switch (m.type) {
      case "assetToken":
        world.setToken(m.token);
        break;
      case "loginOk":
        state.selfId = m.agent.id;
        break;
      case "region":
        world.setRegion(m);
        state.region = m.name;
        state.predicted = null;
        state.serverPos = null;
        onStatus?.(m.name);
        break;
      case "terrain":
        world.setTerrain(m);
        break;
      case "objects":
        world.applyObjects(m);
        break;
      case "avatars": {
        world.setAvatars(m.list);
        const self = m.list.find((a) => a.self);
        if (self) {
          state.serverPos = new THREE.Vector3(...self.pos);
          if (self.sitting !== undefined) state.sitting = self.sitting;
        }
        break;
      }
      default:
        onEvent?.(m);
    }
  };

  const yawFromCamera = (camera) => {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    return Math.atan2(-dir.z, dir.x);
  };

  // input: { fwd, strafe, up, run } in [-1, 1]; yaw in Second Life convention (radians from east).
  const update = (dt, { input, yaw }) => {
    world.update(dt);
    const q = (v) => (Math.abs(v) > DEADZONE ? Math.sign(v) : 0);
    const cur = { fwd: q(input.fwd), strafe: q(input.strafe), up: q(input.up), fly: state.fly, run: Boolean(input.run || state.run) };
    const now = performance.now();
    const changed = !state.lastSent || ["fwd", "strafe", "up", "fly", "run"].some((k) => state.lastSent[k] !== cur[k]);
    const yawDelta = state.lastSent ? Math.abs(Math.atan2(Math.sin(yaw - state.lastSent.yaw), Math.cos(yaw - state.lastSent.yaw))) : 1;
    if (changed || (yawDelta > 0.08 && now - state.lastSentAt > 150) || now - state.lastSentAt > 2000) {
      send({ type: "move", ...cur, yaw });
      state.lastSent = { ...cur, yaw };
      state.lastSentAt = now;
    }
    if (!state.serverPos) return null;
    if (!state.predicted) state.predicted = state.serverPos.clone();
    const p = state.predicted;
    if (!state.sitting) {
      const speed = state.fly ? 10 : cur.run ? 6 : 3.2;
      p.x += (Math.cos(yaw) * cur.fwd + Math.sin(yaw) * cur.strafe) * speed * dt;
      p.y += (Math.sin(yaw) * cur.fwd - Math.cos(yaw) * cur.strafe) * speed * dt;
      if (state.fly) p.z += cur.up * 6 * dt;
    }
    if (p.distanceTo(state.serverPos) > 4) p.copy(state.serverPos);
    const kxy = 1 - Math.exp(-dt * 2.5);
    const kz = 1 - Math.exp(-dt * 6);
    p.x += (state.serverPos.x - p.x) * kxy;
    p.y += (state.serverPos.y - p.y) * kxy;
    p.z += (state.serverPos.z - p.z) * kz;
    return slToThree([p.x, p.y, p.z - AV_OFFSET]);
  };

  const pick = (raycaster) => {
    const hit = raycaster.intersectObjects(world.pickables, false)[0];
    return hit?.object.userData.localId !== undefined ? hit.object.userData : null;
  };

  const setSelfVisible = (visible) => {
    for (const av of world.avatars.values()) if (av.self) av.group.visible = visible;
    world.showSelf = visible;
  };

  return { world, state, handle, update, pick, yawFromCamera, setSelfVisible, dispose: () => world.dispose() };
}
