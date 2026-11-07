import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronUp, MessageSquare, Move, Hammer, Camera,
  Volume2, VolumeX, Music, Sun, Moon, Mic, MicOff,
  Video, Pause, Play, SkipForward, Crosshair
} from "lucide-react";

const BOTTOM_TOOLS = [
  { id: "chat", icon: MessageSquare, label: "Chat" },
  { id: "move", icon: Move, label: "Move" },
  { id: "build", icon: Hammer, label: "Build" },
  { id: "snapshot", icon: Camera, label: "Snapshot" },
  { id: "voice", icon: Mic, label: "Voice" },
  { id: "gestures", icon: Crosshair, label: "Gestures" },
  { id: "media", icon: Music, label: "Media" },
  { id: "sound", icon: Volume2, label: "Sound" },
  { id: "video", icon: Video, label: "Video" },
  { id: "daylight", icon: Sun, label: "Environment" },
];

export default function RightToolbar({ onToolSelect, activeTool }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed right-0 bottom-0 z-40 flex flex-col items-end pb-3 pr-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 mb-1 shadow-2xl"
          >
            {BOTTOM_TOOLS.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => { onToolSelect(tool.id); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    isActive
                      ? "bg-neon-purple/20 text-neon-purple"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">{tool.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-all"
      >
        <ChevronUp className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
    </div>
  );
}