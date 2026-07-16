import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Search, MapPin, Navigation, ZoomIn, ZoomOut } from "lucide-react";

export default function MapPanel({ onClose }) {
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(1);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-4 z-50 bg-black/85 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="text-white font-semibold text-sm">World Map</h3>
        <button onClick={onClose} className="text-white/40 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search regions, places..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* Map area */}
      <div className="flex-1 relative bg-gradient-to-br from-blue-950/30 to-green-950/20">
        {/* Grid */}
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: `${32 * zoom}px ${32 * zoom}px` }} />

        {/* Simulated regions */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="w-16 h-16 bg-green-800/40 border border-green-500/20 rounded" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <Navigation className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-cyan-400 text-[9px] whitespace-nowrap">You are here</p>
          </div>
        </div>

        {/* Zoom controls */}
        <div className="absolute right-3 bottom-3 flex flex-col gap-1">
          <button onClick={() => setZoom(z => Math.min(z + 0.25, 3))} className="w-8 h-8 bg-black/50 rounded-lg flex items-center justify-center text-white/60 hover:text-white">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} className="w-8 h-8 bg-black/50 rounded-lg flex items-center justify-center text-white/60 hover:text-white">
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          Welcome Island (128, 128, 25)
        </span>
        <button className="text-cyan-400 hover:text-cyan-300">Teleport Home</button>
      </div>
    </motion.div>
  );
}