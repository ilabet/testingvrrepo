import React, { useEffect, useState } from "react";
import { Glasses } from "lucide-react";

export default function XRButton({ renderer }) {
  const [supported, setSupported] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!navigator.xr?.isSessionSupported) return;
    navigator.xr.isSessionSupported("immersive-vr").then(setSupported).catch(() => {});
  }, []);

  const enterVR = async () => {
    if (!renderer || !navigator.xr) return;
    setError("");
    try {
      const session = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
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
    <div className="fixed top-3 right-3 z-50 flex flex-col items-end gap-1">
      <button
        onClick={presenting ? exitVR : enterVR}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
          presenting
            ? "bg-neon-pink/20 border-neon-pink/40 text-neon-pink"
            : "bg-gradient-to-r from-neon-purple to-neon-pink text-white border-transparent shadow-lg shadow-neon-purple/30"
        }`}
      >
        <Glasses className="w-4 h-4" />
        {presenting ? "Exit VR" : "Enter VR"}
      </button>
      {error && (
        <span className="text-[10px] text-neon-pink max-w-[160px] text-right">{error}</span>
      )}
    </div>
  );
}