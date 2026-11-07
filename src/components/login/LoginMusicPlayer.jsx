import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Music2, X } from "lucide-react";
import { parseMusicUrl } from "@/lib/musicEmbed";

export default function LoginMusicPlayer({ url, title }) {
  const [open, setOpen] = useState(false);
  const track = parseMusicUrl(url);
  if (!track) return null;

  return (
    <div className="fixed bottom-4 left-4 z-30 w-[260px] max-w-[calc(100vw-2rem)]">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-2 overflow-hidden rounded-xl border border-white/15 bg-[#0c0810]/95 p-2 shadow-2xl backdrop-blur-xl"
          >
            <div className="mb-1.5 flex items-center gap-2 px-1">
              <Music2 className="h-3.5 w-3.5 shrink-0 text-neon-pink" />
              <p className="min-w-0 flex-1 truncate text-[10px] text-white/60">
                {title || track.label}
              </p>
              <button
                onClick={() => setOpen(false)}
                className="text-white/30 transition-colors hover:text-white"
                aria-label="Close music player"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            {track.kind === "audio" ? (
              <audio src={track.embedUrl} controls autoPlay className="w-full" />
            ) : (
              <div
                className="relative w-full overflow-hidden rounded-lg bg-black"
                style={track.height ? { height: `${track.height}px` } : { aspectRatio: "16 / 9" }}
              >
                <iframe
                  src={track.embedUrl}
                  title="Login music"
                  className="absolute inset-0 h-full w-full"
                  allow="autoplay; encrypted-media; clipboard-write; picture-in-picture; fullscreen"
                  frameBorder="0"
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-white/15 bg-[#0c0810]/90 px-3 py-2 text-[11px] text-white/70 backdrop-blur-xl transition-colors hover:text-white"
      >
        <Music2 className={`h-3.5 w-3.5 ${open ? "text-neon-pink" : "text-white/50"}`} />
        {open ? "Hide music" : "Play music"}
        <span className="text-[9px] uppercase tracking-widest text-white/30">{track.provider}</span>
      </button>
    </div>
  );
}