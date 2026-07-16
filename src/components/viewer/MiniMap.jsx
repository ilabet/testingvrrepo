import React from "react";
import { motion } from "framer-motion";
import { Navigation } from "lucide-react";

export default function MiniMap() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed top-3 right-14 z-30 w-28 h-28 bg-black/50 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden"
    >
      {/* Mini map grid */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-green-950/40 to-blue-950/30"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />

      {/* Player marker */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <Navigation className="w-3 h-3 text-cyan-400" />
      </div>

      {/* Nearby dots */}
      <div className="absolute top-8 left-10 w-1.5 h-1.5 rounded-full bg-green-400/60" />
      <div className="absolute top-14 left-16 w-1.5 h-1.5 rounded-full bg-green-400/60" />
      <div className="absolute top-10 right-6 w-1.5 h-1.5 rounded-full bg-yellow-400/60" />

      {/* Label */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-2 py-0.5">
        <p className="text-white/50 text-[8px] text-center truncate">Welcome Island</p>
      </div>
    </motion.div>
  );
}