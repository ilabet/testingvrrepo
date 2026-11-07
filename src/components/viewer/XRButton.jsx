import React, { useEffect, useState } from "react";
import { Glasses, SlidersHorizontal } from "lucide-react";
import VRControlsPanel from "./VRControlsPanel";

export default function XRButton({ renderer }) {
  const [supported, setSupported] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!navigator.xr?.isSessionSupported) return;
    navigator.xr.isSessionSupported("immersive-vr").then(setSupported).catch(() => {});
  }, []);

  useEffect(() => {
    const session = renderer?.xr?.getSession?.();
    if (session) setPresenting(true);
  }, [renderer]);

  const enterVR = async () => {
    if (!renderer || !navigator.xr) return;
    setError("");
    try {
      const session = await navigator.xr.requestSession("immersive-vr", {
        requiredFeatures: ["local-floor"],
        optionalFeatures: ["bounded-floor", "hand-tracking", "layers"],
      });
      session.addEventListener("end", () => setPresenting(false));
      await renderer.xr.setSession(session);
      setPresenting(true);
    } catch (e) {
      setError(e?.message || "Could not start VR session");
    }
  };

  const exitVR = () => {
    renderer?.xr?.getSession()?.end();
  };

  if (!supported && !presenting) return null;

  return (
    <div className="fixed right-3 top-3 z-50 flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5">
        <button
          onClick={presenting ? exitVR : enterVR}
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
            presenting
              ? "border-neon-pink/40 bg-neon-pink/20 text-neon-pink"
              : "border-transparent bg-gradient-to-r from-neon-purple to-neon-pink text-white shadow-lg shadow-neon-purple/30"
          }`}
        >
          <Glasses className="h-4 w-4" />
          {presenting ? "Exit VR" : "Enter VR"}
        </button>
        <button
          onClick={() => setShowControls((v) => !v)}
          className="rounded-xl border border-white/10 bg-black/50 p-2 text-white/60 backdrop-blur-md transition-colors hover:text-white"
          aria-label="VR controls"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      {presenting && (
        <span className="max-w-[190px] text-right text-[9px] leading-relaxed text-white/50">
          Left stick move · right stick turn · A jump · B quick menu · trigger to select
        </span>
      )}
      {error && <span className="max-w-[160px] text-right text-[10px] text-neon-pink">{error}</span>}

      {showControls && <VRControlsPanel onClose={() => setShowControls(false)} />}
    </div>
  );
}