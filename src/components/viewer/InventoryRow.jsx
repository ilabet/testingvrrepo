import React from "react";
import { Check, Trash2, Loader2 } from "lucide-react";

export default function InventoryRow({ item, busy, onToggleWorn, onRemove }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all">
      <button
        onClick={() => onToggleWorn(item)}
        disabled={busy}
        title={item.worn ? "Take off" : "Wear"}
        className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
          item.worn
            ? "bg-neon-purple border-neon-purple text-white"
            : "border-white/25 text-transparent hover:border-neon-purple/60"
        }`}
      >
        <Check className="w-3 h-3" />
      </button>

      <span className={`flex-1 truncate text-xs ${item.worn ? "text-white" : "text-white/60"}`}>
        {item.name}
      </span>

      {busy ? (
        <Loader2 className="w-3 h-3 text-neon-purple animate-spin" />
      ) : (
        <button
          onClick={() => onRemove(item)}
          title="Delete item"
          className="text-white/20 hover:text-red-400 p-1 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}