const KEY = "sl_vr_controls";

export const DEFAULT_CONTROLS = {
  turnMode: "snap", // "snap" | "smooth"
  snapAngle: 30, // degrees per snap
  moveSpeed: 2.4, // m/s at half stick
  runMultiplier: 1.8, // applied when the stick is pushed to the edge
  showHud: true,
};

export function loadControls() {
  try {
    return { ...DEFAULT_CONTROLS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...DEFAULT_CONTROLS };
  }
}

export function saveControls(next) {
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("vr-controls-updated", { detail: next }));
}