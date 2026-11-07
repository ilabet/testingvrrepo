import React from "react";
import { Globe, HelpCircle, Bug, Palette, MonitorPlay } from "lucide-react";
import { Image } from "@/components/ui/image";
import { APP_LOGO } from "@/components/login/loginTheme";
import { FRAME_PRESETS } from "@/lib/framePresets";
import LoginOrnament from "@/components/login/LoginOrnament";

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
  logoUrl,
  frameStyle = "none",
}) {
  const frame = FRAME_PRESETS[frameStyle] || FRAME_PRESETS.none;

  return (
    <div className="relative w-full" style={{ filter: `drop-shadow(0 0 38px ${frame.glow})` }}>
      {/* Metallic outer frame */}
      <div className="rounded-[18px] p-[3px]" style={{ background: frame.frameGradient }}>
        <div
          className="overflow-hidden rounded-[15px] text-white backdrop-blur-xl"
          style={{ backgroundColor: frame.ink, border: `1px solid ${frame.border}55` }}
        >
          {/* Title bar */}
          <div
            className="relative flex items-center gap-2.5 border-b px-3 py-2"
            style={{ background: frame.title, borderColor: `${frame.border}55` }}
          >
            <Image
              src={logoUrl || APP_LOGO}
              alt="Second Life Go"
              fittingType="fit"
              className="h-6 w-6 shrink-0 rounded-md"
            />
            <div className="min-w-0">
              <p className="truncate font-serif text-sm font-bold leading-none text-white">Second Life Go</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-[0.18em]" style={{ color: `${frame.ornamentColor}cc` }}>
                Mobile viewer
              </p>
            </div>
            <span className="ml-auto flex min-w-0 items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] text-white/60">
              <Globe className="h-3 w-3 shrink-0" style={{ color: frame.ornamentColor }} />
              <span className="truncate">{gridLabel}</span>
            </span>
          </div>

          {children}

          {/* Status bar */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/10 bg-black/50 px-3 py-1.5">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${loading ? "w-2/3 animate-pulse" : "w-1/3"}`}
                style={{ background: frame.frameGradient }}
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
      </div>

      <LoginOrnament type={frame.ornament} color={frame.ornamentColor} position="top" />
      <LoginOrnament type={frame.ornament} color={frame.ornamentColor} position="bottom" />
    </div>
  );
}