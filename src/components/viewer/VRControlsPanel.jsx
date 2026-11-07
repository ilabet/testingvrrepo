import React, { useState } from "react";
import { X, RotateCcw } from "lucide-react";
import { DEFAULT_CONTROLS, loadControls, saveControls } from "@/lib/vrControls";

const ANGLES = [15, 30, 45, 90];

export default function VRControlsPanel({ onClose }) {
  const [cfg, setCfg] = useState(() => loadControls());
  const update = (patch) => {
    const next = { ...cfg, ...patch };
    setCfg(next);
    saveControls(next);
  };

  return (
    <div className="w-72 rounded-2xl border border-white/10 bg-black/80 p-4 text-white shadow-2xl backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-serif text-sm font-bold">VR controls</h3>
        <button onClick={onClose} className="text-white/40 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">Turn mode</p>
          <div className="flex gap-1">
            {["snap", "smooth"].map((mode) => (
              <button
                key={mode}
                onClick={() => update({ turnMode: mode })}
                className={`flex-1 rounded-lg py-1.5 text-[11px] capitalize transition-colors ${
                  cfg.turnMode === mode ? "bg-white/15 text-white" : "bg-white/5 text-white/40 hover:text-white/70"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {cfg.turnMode === "snap" && (
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">Snap angle</p>
            <div className="flex gap-1">
              {ANGLES.map((angle) => (
                <button
                  key={angle}
                  onClick={() => update({ snapAngle: angle })}
                  className={`flex-1 rounded-lg py-1.5 text-[11px] transition-colors ${
                    cfg.snapAngle === angle ? "bg-white/15 text-white" : "bg-white/5 text-white/40 hover:text-white/70"
                  }`}
                >
                  {angle}°
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="mb-1 flex justify-between text-[10px] text-white/40">
            <span>Move speed</span>
            <span>{cfg.moveSpeed.toFixed(1)} m/s</span>
          </div>
          <input
            type="range"
            min="1"
            max="6"
            step="0.2"
            value={cfg.moveSpeed}
            onChange={(e) => update({ moveSpeed: Number(e.target.value) })}
            className="h-1 w-full accent-white"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/60">Show quick menu</span>
          <button
            onClick={() => update({ showHud: !cfg.showHud })}
            className={`h-5 w-9 rounded-full p-0.5 transition-colors ${cfg.showHud ? "bg-white/80" : "bg-white/15"}`}
          >
            <span
              className={`block h-4 w-4 rounded-full bg-black transition-transform ${cfg.showHud ? "translate-x-4" : ""}`}
            />
          </button>
        </div>

        <button
          onClick={() => {
            setCfg({ ...DEFAULT_CONTROLS });
            saveControls({ ...DEFAULT_CONTROLS });
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/5 py-2 text-[11px] text-white/50 hover:bg-white/10 hover:text-white"
        >
          <RotateCcw className="h-3 w-3" /> Reset to VRChat defaults
        </button>
      </div>
    </div>
  );
}