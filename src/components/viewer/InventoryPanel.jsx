import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Search, Loader2, Shirt, Package } from "lucide-react";
import { base44 } from "@/api/base44Client";
import InventoryRow from "./InventoryRow";

const CATEGORIES = [
  { id: "clothing", label: "Clothing" },
  { id: "body_part", label: "Body Parts" },
  { id: "object", label: "Objects" },
  { id: "texture", label: "Textures" },
  { id: "script", label: "Scripts" },
  { id: "notecard", label: "Notecards" },
  { id: "sound", label: "Sounds" },
];

const DEFAULT_ITEMS = [
  { name: "Black Leather Jacket", category: "clothing", worn: true },
  { name: "Classic Blue Jeans", category: "clothing", worn: true },
  { name: "White Sneakers", category: "clothing", worn: true },
  { name: "Baseball Cap", category: "clothing", worn: false },
  { name: "Default Shape", category: "body_part", worn: true },
  { name: "Natural Skin", category: "body_part", worn: true },
  { name: "Styled Hair", category: "body_part", worn: true },
  { name: "Natural Walk AO", category: "object", worn: false },
  { name: "Dance HUD", category: "object", worn: false },
  { name: "Wood Plank Texture", category: "texture", worn: false },
  { name: "Door Script", category: "script", worn: false },
  { name: "Welcome Note", category: "notecard", worn: false },
  { name: "Footstep SFX", category: "sound", worn: false },
];

export default function InventoryPanel({ onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const load = async () => {
      const page = await base44.entities.InventoryItem.list({ sort: "-created_date", limit: 200 });
      if (page.items.length === 0) {
        await base44.entities.InventoryItem.bulkCreate(DEFAULT_ITEMS);
        const seeded = await base44.entities.InventoryItem.list({ sort: "-created_date", limit: 200 });
        setItems(seeded.items);
      } else {
        setItems(page.items);
      }
    };
    load().finally(() => setLoading(false));
  }, []);

  const toggleWorn = async (item) => {
    const worn = !item.worn;
    setBusyId(item.id);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, worn } : i)));
    try {
      await base44.entities.InventoryItem.update(item.id, { worn });
    } catch {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, worn: item.worn } : i)));
    } finally {
      setBusyId(null);
    }
  };

  const removeItem = async (item) => {
    if (!window.confirm(`Delete "${item.name}" from your inventory?`)) return;
    setBusyId(item.id);
    try {
      await base44.entities.InventoryItem.delete(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } finally {
      setBusyId(null);
    }
  };

  const wornItems = items.filter((i) => i.worn);
  const q = search.trim().toLowerCase();
  const visible = items.filter((i) => !q || i.name.toLowerCase().includes(q));
  const listed = tab === "worn" ? visible.filter((i) => i.worn) : visible;

  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    items: listed.filter((i) => i.category === cat.id),
  })).filter((cat) => cat.items.length > 0);

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
          <Package className="w-4 h-4 text-neon-purple" />
          Inventory
        </h3>
        <button onClick={onClose} className="text-white/40 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-1 px-3 pt-2">
        {[
          { id: "all", label: "All items" },
          { id: "worn", label: `Wearing (${wornItems.length})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === t.id ? "bg-neon-purple/20 text-neon-purple" : "text-white/40 hover:text-white/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter inventory..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-neon-purple/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-4 h-4 text-neon-purple animate-spin" />
          </div>
        ) : listed.length === 0 ? (
          <p className="text-center text-white/30 text-xs py-10">
            {tab === "worn" ? "Nothing is being worn yet." : "No items match that search."}
          </p>
        ) : (
          <>
            {tab === "all" && wornItems.length > 0 && !q && (
              <div className="mb-3 px-2 py-2 rounded-xl bg-neon-purple/10 border border-neon-purple/20">
                <p className="text-[10px] uppercase tracking-wide text-neon-purple/80 mb-1 flex items-center gap-1">
                  <Shirt className="w-3 h-3" /> Currently wearing
                </p>
                <p className="text-white/70 text-[11px] leading-relaxed">
                  {wornItems.map((i) => i.name).join(" · ")}
                </p>
              </div>
            )}

            {grouped.map((cat) => (
              <div key={cat.id} className="mb-2">
                <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-white/35">
                  {cat.label} · {cat.items.length}
                </p>
                {cat.items.map((item) => (
                  <InventoryRow
                    key={item.id}
                    item={item}
                    busy={busyId === item.id}
                    onToggleWorn={toggleWorn}
                    onRemove={removeItem}
                  />
                ))}
              </div>
            ))}
          </>
        )}
      </div>

      <div className="border-t border-white/5 px-3 py-2">
        <p className="text-white/30 text-[10px]">
          Tap the circle to wear or take off an item. Changes save automatically.
        </p>
      </div>
    </motion.div>
  );
}