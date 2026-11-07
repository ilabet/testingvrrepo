import React, { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { Image } from "@/components/ui/image";
import { APP_LOGO } from "./loginTheme";

export default function LoginTopBar({ onViewer, onHelp, onDebug, onCustomize, canCustomize, onOwnerLogin }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <header className="relative z-20 flex items-center gap-4 px-4 py-3 sm:px-6">
      <div className="flex items-center gap-2.5">
        <Image src={APP_LOGO} alt="Second Life Go" fittingType="fit" className="h-8 w-8 rounded-full" />
        <span className="font-serif text-sm font-bold tracking-wide text-white">SECOND LIFE GO</span>
      </div>

      <nav className="ml-2 flex items-center gap-1 sm:ml-6">
        <button
          onClick={onViewer}
          className="rounded-full px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          Viewer
        </button>
        <button
          onClick={onHelp}
          className="rounded-full px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          Help
        </button>
        <button
          onClick={onDebug}
          className="rounded-full px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          Debug
        </button>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] text-white/60 sm:block">
          {time}
        </span>
        {canCustomize ? (
          <button
            onClick={onCustomize}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Palette className="h-3.5 w-3.5" />
            Customize
          </button>
        ) : (
          <button
            onClick={onOwnerLogin}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            Owner sign in
          </button>
        )}
      </div>
    </header>
  );
}