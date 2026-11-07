import React from "react";
import { DISCORD_INVITE } from "@/lib/links";

function DiscordGlyph({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.317 4.369A19.79 19.79 0 0 0 15.432 3a13.9 13.9 0 0 0-.617 1.27 18.27 18.27 0 0 0-5.63 0A13.6 13.6 0 0 0 8.568 3 19.74 19.74 0 0 0 3.68 4.371C.53 9.15-.32 13.81.1 18.404a19.9 19.9 0 0 0 6.02 3.04c.48-.66.91-1.36 1.28-2.09-.7-.26-1.37-.58-2.01-.96.17-.12.33-.25.49-.38a14.2 14.2 0 0 0 12.24 0c.16.13.32.26.49.38-.64.38-1.31.7-2.01.96.37.73.8 1.43 1.28 2.09a19.86 19.86 0 0 0 6.02-3.04c.5-5.32-.86-9.94-3.57-14.035ZM8.02 15.53c-1.18 0-2.15-1.08-2.15-2.4 0-1.32.95-2.41 2.15-2.41 1.2 0 2.17 1.09 2.15 2.41 0 1.32-.95 2.4-2.15 2.4Zm7.96 0c-1.18 0-2.15-1.08-2.15-2.4 0-1.32.95-2.41 2.15-2.41 1.2 0 2.17 1.09 2.15 2.41 0 1.32-.95 2.4-2.15 2.4Z" />
    </svg>
  );
}

export default function LoginDiscordBadge({ accent }) {
  return (
    <a
      href={DISCORD_INVITE}
      target="_blank"
      rel="noreferrer noopener"
      className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-[11px] text-white/60 backdrop-blur-md transition-colors hover:border-white/30 hover:text-white"
    >
      <span style={{ color: accent }}>
        <DiscordGlyph className="h-3.5 w-3.5" />
      </span>
      <span className="font-medium">Join the Discord</span>
      <span className="text-white/25 transition-colors group-hover:text-white/50">↗</span>
    </a>
  );
}