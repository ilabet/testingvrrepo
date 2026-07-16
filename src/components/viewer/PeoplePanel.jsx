import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Search, Users, MessageSquare, UserPlus, MapPin } from "lucide-react";

const NEARBY = [
  { id: 1, name: "Alex Resident", distance: "5m", status: "online" },
  { id: 2, name: "Jordan Smith", distance: "12m", status: "online" },
  { id: 3, name: "Sam Builder", distance: "28m", status: "away" },
];

const FRIENDS = [
  { id: 4, name: "Chris Explorer", status: "online", location: "Sunset Beach" },
  { id: 5, name: "Jamie Creator", status: "offline", location: "Last seen 2h ago" },
];

export default function PeoplePanel({ onClose }) {
  const [tab, setTab] = useState("nearby");
  const [search, setSearch] = useState("");

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed left-0 top-0 bottom-0 w-72 z-50 bg-black/80 backdrop-blur-xl border-r border-white/10 flex flex-col"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="text-white font-semibold text-sm">People</h3>
        <button onClick={onClose} className="text-white/40 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-3 pt-2">
        <button onClick={() => setTab("nearby")} className={`flex-1 py-2 rounded-lg text-xs font-medium ${tab === "nearby" ? "bg-cyan-500/20 text-cyan-400" : "text-white/40 hover:text-white/60"}`}>
          Nearby
        </button>
        <button onClick={() => setTab("friends")} className={`flex-1 py-2 rounded-lg text-xs font-medium ${tab === "friends" ? "bg-cyan-500/20 text-cyan-400" : "text-white/40 hover:text-white/60"}`}>
          Friends
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people..." className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-cyan-500/50" />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        {(tab === "nearby" ? NEARBY : FRIENDS).map((person) => (
          <div key={person.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all cursor-pointer">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800" />
              <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black ${person.status === "online" ? "bg-green-400" : person.status === "away" ? "bg-yellow-400" : "bg-gray-500"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{person.name}</p>
              <p className="text-gray-500 text-[10px]">
                {person.distance || person.location}
              </p>
            </div>
            <div className="flex gap-1">
              <button className="p-1.5 text-white/30 hover:text-cyan-400 rounded-lg hover:bg-white/5">
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
              {tab === "nearby" && (
                <button className="p-1.5 text-white/30 hover:text-cyan-400 rounded-lg hover:bg-white/5">
                  <UserPlus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}