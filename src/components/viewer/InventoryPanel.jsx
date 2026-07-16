import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  X, Folder, FolderOpen, Shirt, Image, Box, FileText,
  Music, Code, Search, ChevronRight, ChevronDown
} from "lucide-react";

const INVENTORY_TREE = [
  {
    id: "clothing",
    label: "Clothing",
    icon: Shirt,
    items: [
      { id: "c1", label: "Jacket - Black Leather", type: "clothing" },
      { id: "c2", label: "Jeans - Classic Blue", type: "clothing" },
      { id: "c3", label: "Sneakers - White", type: "clothing" },
      { id: "c4", label: "T-Shirt - Logo", type: "clothing" },
      { id: "c5", label: "Hat - Baseball Cap", type: "clothing" },
    ],
  },
  {
    id: "body_parts",
    label: "Body Parts",
    icon: Box,
    items: [
      { id: "b1", label: "Shape - Default", type: "bodypart" },
      { id: "b2", label: "Skin - Natural", type: "bodypart" },
      { id: "b3", label: "Hair - Styled", type: "bodypart" },
      { id: "b4", label: "Eyes - Hazel", type: "bodypart" },
    ],
  },
  {
    id: "objects",
    label: "Objects",
    icon: Box,
    items: [
      { id: "o1", label: "Dance HUD", type: "object" },
      { id: "o2", label: "AO - Natural Walk", type: "object" },
      { id: "o3", label: "Pose Stand", type: "object" },
    ],
  },
  {
    id: "textures",
    label: "Textures",
    icon: Image,
    items: [
      { id: "t1", label: "Wood Plank", type: "texture" },
      { id: "t2", label: "Grass Tile", type: "texture" },
    ],
  },
  {
    id: "scripts",
    label: "Scripts",
    icon: Code,
    items: [
      { id: "s1", label: "Door Script", type: "script" },
      { id: "s2", label: "Sit Script", type: "script" },
    ],
  },
  {
    id: "notecards",
    label: "Notecards",
    icon: FileText,
    items: [
      { id: "n1", label: "Welcome Note", type: "notecard" },
      { id: "n2", label: "Instructions", type: "notecard" },
    ],
  },
  {
    id: "sounds",
    label: "Sounds",
    icon: Music,
    items: [
      { id: "snd1", label: "Footstep SFX", type: "sound" },
    ],
  },
];

export default function InventoryPanel({ onClose }) {
  const [expandedFolders, setExpandedFolders] = useState(["clothing"]);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);

  const toggleFolder = (id) => {
    setExpandedFolders((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const filteredTree = search
    ? INVENTORY_TREE.map((folder) => ({
        ...folder,
        items: folder.items.filter((item) =>
          item.label.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((folder) => folder.items.length > 0)
    : INVENTORY_TREE;

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed left-0 top-0 bottom-0 w-72 z-50 bg-black/80 backdrop-blur-xl border-r border-white/10 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="text-white font-semibold text-sm">Inventory</h3>
        <button onClick={onClose} className="text-white/40 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter inventory..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {filteredTree.map((folder) => {
          const Icon = folder.icon;
          const isExpanded = expandedFolders.includes(folder.id) || search;
          return (
            <div key={folder.id}>
              <button
                onClick={() => toggleFolder(folder.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all text-xs"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 text-gray-500" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-500" />
                )}
                {isExpanded ? (
                  <FolderOpen className="w-3.5 h-3.5 text-yellow-400/70" />
                ) : (
                  <Folder className="w-3.5 h-3.5 text-yellow-400/50" />
                )}
                <span>{folder.label}</span>
                <span className="ml-auto text-gray-600 text-[10px]">{folder.items.length}</span>
              </button>

              {isExpanded && (
                <div className="ml-5 border-l border-white/5 pl-2">
                  {folder.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
                        selectedItem?.id === item.id
                          ? "bg-cyan-500/15 text-cyan-400"
                          : "text-white/50 hover:text-white/80 hover:bg-white/5"
                      }`}
                    >
                      <Icon className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action bar */}
      {selectedItem && (
        <div className="border-t border-white/5 px-3 py-2">
          <p className="text-white text-xs font-medium truncate mb-2">{selectedItem.label}</p>
          <div className="flex gap-2">
            <button className="flex-1 bg-cyan-500/20 text-cyan-400 text-xs py-2 rounded-lg hover:bg-cyan-500/30 transition-all">
              Wear
            </button>
            <button className="flex-1 bg-white/5 text-white/60 text-xs py-2 rounded-lg hover:bg-white/10 transition-all">
              Details
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}