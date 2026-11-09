import React from "react";
import { X } from "lucide-react";

export default function LoginInfoDialog({ mode, proxyUrl, onClose }) {
  const wsUrl = localStorage.getItem("sl_ws_url") || "—";

  const rows = [
    ["Proxy server", proxyUrl || `${window.location.origin} (this server)`],
    ["World stream", wsUrl],
    ["Saved proxy", localStorage.getItem("sl_proxy_url") || "not set"],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1818] p-5 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-serif text-base font-bold text-white">
            {mode === "help" ? "Help" : "Debug"}
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {mode === "help" ? (
          <ul className="space-y-2 text-xs leading-relaxed text-white/60">
            <li>Sign in with your Second Life first and last name plus your account password.</li>
            <li>Leave the proxy field empty to use the bridge this page is served from; enter another bridge URL only if you run your own elsewhere.</li>
            <li>Entering VR needs this page opened in your headset's own browser over https (your Railway domain).</li>
            <li>If the bridge has DISCORD_WEBHOOK_URL set, it posts a Discord alert when the world stream drops.</li>
          </ul>
        ) : (
          <div className="space-y-2">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
                <span className="text-[10px] uppercase tracking-wider text-white/40">{label}</span>
                <span className="break-all text-right text-[11px] text-white/70">{value}</span>
              </div>
            ))}
            <button
              onClick={() => {
                localStorage.removeItem("sl_ws_url");
                localStorage.removeItem("sl_proxy_url");
                onClose();
              }}
              className="mt-1 w-full rounded-lg bg-red-500/10 py-2 text-[11px] text-red-300 hover:bg-red-500/20"
            >
              Clear stored stream settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}