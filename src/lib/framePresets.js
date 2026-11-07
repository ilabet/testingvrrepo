export const FRAME_PRESETS = {
  none: {
    label: "No frame",
    swatch: "#2a2333",
    frameGradient: "linear-gradient(135deg,#1e1a24,#2a2333,#1a1522)",
    border: "#2a2333",
    ink: "#0c0810",
    glow: "rgba(168,85,247,0.35)",
    title: "linear-gradient(90deg,#170d22,#241033,#140b1c)",
    brand: "linear-gradient(180deg,rgba(168,85,247,0.15),transparent,rgba(236,72,153,0.15))",
    ornament: "none",
    ornamentColor: "#a855f7",
  },
  bronze: {
    label: "Bronze Lotus",
    swatch: "#b59e84",
    frameGradient:
      "linear-gradient(135deg,#4a3d34,#94775d,#e6d9c6,#b59e84,#6b584a,#94775d)",
    border: "#b59e84",
    ink: "#12191e",
    glow: "rgba(181,158,132,0.45)",
    title: "linear-gradient(90deg,#241b14,#3b2c1f,#241b14)",
    brand: "linear-gradient(180deg,#1b262d,#0c141a 55%,rgba(145,90,99,0.35))",
    ornament: "lotus",
    ornamentColor: "#c28892",
  },
  gothic: {
    label: "Gothic Mono",
    swatch: "#d4d4d4",
    frameGradient:
      "linear-gradient(135deg,#2b2b2b,#8f8f8f,#ffffff,#5a5a5a,#d4d4d4,#2b2b2b)",
    border: "#cfcfcf",
    ink: "#0a0a0a",
    glow: "rgba(255,255,255,0.22)",
    title: "linear-gradient(90deg,#0e0e0e,#1f1f1f,#0e0e0e)",
    brand: "linear-gradient(180deg,rgba(255,255,255,0.1),rgba(0,0,0,0.75))",
    ornament: "sword",
    ornamentColor: "#e5e5e5",
  },
  lily: {
    label: "Lily Water",
    swatch: "#e8a4b3",
    frameGradient:
      "linear-gradient(135deg,#0d171e,#8ba0ab,#f2d2d7,#c6a697,#2a3a44)",
    border: "#f2d2d7",
    ink: "#0a1015",
    glow: "rgba(232,164,179,0.4)",
    title: "linear-gradient(90deg,#0d171e,#16292f,#0d171e)",
    brand: "linear-gradient(180deg,#0d171e,#0a1015 55%,rgba(232,164,179,0.25))",
    ornament: "lily",
    ornamentColor: "#f2d2d7",
  },
  kawaii: {
    label: "Pastel Lace",
    swatch: "#ff99c8",
    frameGradient:
      "linear-gradient(135deg,#f5b7ce,#fff0f5,#ff99c8,#ffffff,#f5b7ce)",
    border: "#ff99c8",
    ink: "#180e14",
    glow: "rgba(255,153,200,0.45)",
    title: "linear-gradient(90deg,#2a1220,#45203a,#2a1220)",
    brand: "linear-gradient(180deg,#2a1220,#180e14 55%,rgba(255,153,200,0.3))",
    ornament: "bow",
    ornamentColor: "#ff99c8",
  },
};

export const FRAME_PRESET_LIST = Object.entries(FRAME_PRESETS).map(([id, preset]) => ({
  id,
  ...preset,
}));