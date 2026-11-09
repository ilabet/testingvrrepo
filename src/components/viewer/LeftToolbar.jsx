import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, X, User, Package, Map, MapPin, Users,
  Search, Settings, Bell, Globe,
  ShoppingBag, Star, HelpCircle, Compass
} from "lucide-react";

const TOP_TOOLS = [
  { id: "profile", icon: User, label: "Profile" },
  { id: "inventory", icon: Package, label: "Inventory" },
  { id: "map", icon: Map, label: "World Map" },
  { id: "minimap", icon: Compass, label: "Mini Map" },
  { id: "people", icon: Users, label: "People" },
  { id: "places", icon: MapPin, label: "Places" },
  { id: "search", icon: Search, label: "Search" },
  { id: "marketplace", icon: ShoppingBag, label: "Marketplace" },
  { id: "notifications", icon: Bell, label: "Notifications" },
  { id: "groups", icon: Globe, label: "Groups" },
  { id: "favorites", icon: Star, label: "Favorites" },
  { id: "settings", icon: Settings, label: "Settings" },
  { id: "help", icon: HelpCircle, label: "Help" },
];

export default function LeftToolbar({ onToolSelect, activeTool }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed left-0 top-0 bottom-0 z-40 flex items-start pt-3 pl-2">
      <div className="flex flex-col items-start gap-1">
        {/* Toggle button */}
        <button
          onClick={() => setOpen(!open)}
          className="w-10 h-10 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-all"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl max-h-[calc(100vh-80px)] overflow-y-auto scrollbar-hide"
            >
              {TOP_TOOLS.map((tool) => {
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
      </div>
    </div>
  );
}