import React from "react";
import { motion } from "framer-motion";
import { X, MapPin, Calendar, Heart, Edit2 } from "lucide-react";

export default function ProfilePanel({ onClose }) {
  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed left-0 top-0 bottom-0 w-72 z-50 bg-black/80 backdrop-blur-xl border-r border-white/10 flex flex-col"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="text-white font-semibold text-sm">My Profile</h3>
        <button onClick={onClose} className="text-white/40 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Avatar preview */}
        <div className="relative w-full aspect-square bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border-2 border-white/10" />
          <button className="absolute bottom-2 right-2 p-2 bg-black/50 rounded-lg text-white/60 hover:text-white">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Info */}
        <div>
          <h4 className="text-white font-semibold text-lg">Avatar Name</h4>
          <p className="text-gray-500 text-xs">Resident</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-white/50 text-xs">
            <Calendar className="w-3.5 h-3.5" />
            <span>Born: January 2024</span>
          </div>
          <div className="flex items-center gap-2 text-white/50 text-xs">
            <MapPin className="w-3.5 h-3.5" />
            <span>Welcome Island</span>
          </div>
          <div className="flex items-center gap-2 text-white/50 text-xs">
            <Heart className="w-3.5 h-3.5" />
            <span>Partner: None</span>
          </div>
        </div>

        {/* About */}
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-gray-400 text-xs italic">No bio set. Tap to edit your profile.</p>
        </div>

        {/* Quick actions */}
        <div className="space-y-2">
          <button className="w-full bg-cyan-500/20 text-cyan-400 text-xs py-2.5 rounded-xl hover:bg-cyan-500/30 transition-all">
            Edit Appearance
          </button>
          <button className="w-full bg-white/5 text-white/60 text-xs py-2.5 rounded-xl hover:bg-white/10 transition-all">
            Edit Profile
          </button>
        </div>
      </div>
    </motion.div>
  );
}