import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Shirt, RefreshCw } from "lucide-react";

const OUTFIT_PARTS = [
  { id: "hair", label: "Hair", equipped: "Styled Brown" },
  { id: "head", label: "Head", equipped: "Default" },
  { id: "upper", label: "Upper Body", equipped: "T-Shirt Logo" },
  { id: "lower", label: "Lower Body", equipped: "Classic Jeans" },
  { id: "shoes", label: "Shoes", equipped: "White Sneakers" },
  { id: "accessories", label: "Accessories", equipped: "None" },
];

const SAVED_OUTFITS = [
  { id: "o1", label: "Casual Friday" },
  { id: "o2", label: "Night Out" },
  { id: "o3", label: "Beach Day" },
];

export default function AppearancePanel({ onClose }) {
  const [tab, setTab] = useState("wearing");

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed left-0 top-0 bottom-0 w-72 z-50 bg-black/80 backdrop-blur-xl border-r border-white/10 flex flex-col"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <Shirt className="w-4 h-4 text-cyan-400" />
          Appearance
        </h3>
        <button onClick={onClose} className="text-white/40 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-3 pt-2 pb-1">
        {[
          { id: "wearing", label: "Wearing" },
          { id: "outfits", label: "Outfits" },
          { id: "edit", label: "Edit Shape" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === t.id ? "bg-cyan-500/20 text-cyan-400" : "text-white/40 hover:text-white/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tab === "wearing" && (
          <>
            {/* Avatar preview */}
            <div className="w-full aspect-[3/4] bg-gradient-to-b from-gray-800/50 to-gray-900/50 rounded-xl mb-3 flex items-center justify-center border border-white/5">
              <div className="w-16 h-24 rounded-full bg-gradient-to-b from-cyan-500/20 to-purple-500/20 border border-white/10" />
            </div>

            {OUTFIT_PARTS.map((part) => (
              <div key={part.id} className="flex items-center justify-between px-3 py-2.5 bg-white/3 rounded-xl hover:bg-white/5 transition-all">
                <div>
                  <p className="text-white/80 text-xs font-medium">{part.label}</p>
                  <p className="text-gray-500 text-[10px]">{part.equipped}</p>
                </div>
                <button className="text-white/30 hover:text-cyan-400 p-1">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </>
        )}

        {tab === "outfits" && (
          <>
            {SAVED_OUTFITS.map((outfit) => (
              <div key={outfit.id} className="flex items-center justify-between px-3 py-3 bg-white/3 rounded-xl hover:bg-white/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                    <Shirt className="w-4 h-4 text-white/30" />
                  </div>
                  <span className="text-white/80 text-xs">{outfit.label}</span>
                </div>
                <button className="text-cyan-400 text-xs hover:text-cyan-300">Wear</button>
              </div>
            ))}
            <button className="w-full border border-dashed border-white/10 rounded-xl py-3 text-white/30 text-xs hover:text-white/50 hover:border-white/20 transition-all">
              + Save Current Outfit
            </button>
          </>
        )}

        {tab === "edit" && (
          <div className="space-y-4">
            {["Body Fat", "Torso Length", "Leg Length", "Head Size", "Shoulder Width"].map((slider) => (
              <div key={slider}>
                <div className="flex justify-between mb-1">
                  <span className="text-white/60 text-xs">{slider}</span>
                  <span className="text-gray-500 text-xs">50</span>
                </div>
                <input type="range" min="0" max="100" defaultValue="50" className="w-full accent-cyan-500 h-1" />
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}