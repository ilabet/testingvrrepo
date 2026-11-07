import React from "react";
import { Globe, HelpCircle, Bug, Palette, MonitorPlay } from "lucide-react";
import { Image } from "@/components/ui/image";
import { APP_LOGO } from "@/components/login/loginTheme";

export default function LoginWindow({
  gridLabel,
  loading,
  children,
  onViewer,
  onHelp,
  onDebug,
  canCustomize,
  onCustomize,
  onOwnerLogin,
}) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-[#0c0810]/95 text-white shadow-[0_0_90px_-25px_rgba(168,85,247,0.75)] backdrop-blur-xl">
      {/* Title bar */}
      <div className="flex items-center gap-2.5 border-b border-neon-purple/25 bg-gradient-to-r from-[#170d22] via-[#241033] to-[#140b1c] px-3 py-2">
        <Image src={APP_LOGO} alt="Second Life Go" fittingType="fit" className="h-6 w-6 shrink-0" />
        <div className="min-w-0">
          <p className="truncate font-serif text-sm font-bold leading-none text-white">Second Life Go</p>
          <p className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-neon-pink/60">Mobile viewer</p>
        </div>
        <span className="ml-auto flex min-w-0 items-center gap-1.5 rounded-full border border-neon-purple/30 bg-black/40 px-2.5 py-1 text-[10px] text-white/60">
          <Globe className="h-3 w-3 shrink-0 text-neon-blue" />
          <span className="truncate">{gridLabel}</span>
        </span>
      </div>

      {children}

      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/10 bg-black/50 px-3 py-1.5">
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink ${
              loading ? "w-2/3 animate-pulse" : "w-1/3"
            }`}
          />
        </div>
        <span className="text-[10px] text-white/45">
          {loading ? "Connecting to grid…" : `Ready to connect · ${gridLabel}`}
        </span>
        <div className="ml-auto flex items-center gap-3 text-[10px] text-white/40">
          <button onClick={onViewer} className="flex items-center gap-1 transition-colors hover:text-white">
            <MonitorPlay className="h-3 w-3" /> Viewer
          </button>
          <button onClick={onHelp} className="flex items-center gap-1 transition-colors hover:text-white">
            <HelpCircle className="h-3 w-3" /> Help
          </button>
          <button onClick={onDebug} className="flex items-center gap-1 transition-colors hover:text-white">
            <Bug className="h-3 w-3" /> Debug
          </button>
          {canCustomize ? (
            <button onClick={onCustomize} className="flex items-center gap-1 transition-colors hover:text-white">
              <Palette className="h-3 w-3" /> Customize
            </button>
          ) : (
            <button onClick={onOwnerLogin} className="transition-colors hover:text-white">
              Owner sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}