import React, { useRef } from "react";
import { motion } from "framer-motion";
import { X, Upload, Loader2, RotateCcw } from "lucide-react";
import { ACCENT_SWATCHES, DEFAULT_THEME } from "./loginTheme";

const TYPES = [
  { id: "gradient", label: "Gradient" },
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
];

export default function LoginCustomizePanel({ theme, onChange, onSave, onClose, onUpload, saving, uploading }) {
  const fileRef = useRef(null);
  const set = (patch) => onChange({ ...theme, ...patch });

  return (
    <motion.aside
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="fixed right-0 top-0 bottom-0 z-40 flex w-[330px] max-w-[90vw] flex-col border-l border-white/10 bg-[#161515]/95 backdrop-blur-2xl"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 className="font-serif text-sm font-bold text-white">Customize</h3>
        <button onClick={onClose} className="text-white/40 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <section>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-white/40">Background</p>
          <div className="flex gap-1">
            {TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => set({ background_type: t.id })}
                className={`flex-1 rounded-lg py-2 text-[11px] font-medium transition-colors ${
                  theme.background_type === t.id
                    ? "bg-white/15 text-white"
                    : "bg-white/5 text-white/40 hover:text-white/70"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => onUpload(e.target.files?.[0])}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-3 text-[11px] text-white/60 transition-colors hover:border-white/40 hover:text-white disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? "Uploading..." : "Upload image or video"}
          </button>

          {theme.background_url && (
            <button
              onClick={() => set({ background_url: "", background_type: "gradient" })}
              className="mt-2 w-full text-[10px] text-white/35 hover:text-red-400"
            >
              Remove uploaded background
            </button>
          )}
        </section>

        <section>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-white/40">Accent color</p>
          <div className="flex items-center gap-2">
            {ACCENT_SWATCHES.map((c) => (
              <button
                key={c}
                onClick={() => set({ accent_color: c })}
                className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: theme.accent_color === c ? "#ffffff" : "transparent",
                }}
              />
            ))}
            <input
              type="color"
              value={theme.accent_color}
              onChange={(e) => set({ accent_color: e.target.value })}
              className="h-7 w-7 cursor-pointer rounded-full border border-white/20 bg-transparent"
            />
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <div className="mb-1 flex justify-between text-[10px] text-white/40">
              <span>Dim</span>
              <span>{theme.dim}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              value={theme.dim}
              onChange={(e) => set({ dim: Number(e.target.value) })}
              className="h-1 w-full accent-white"
            />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-[10px] text-white/40">
              <span>Blur</span>
              <span>{theme.blur}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              value={theme.blur}
              onChange={(e) => set({ blur: Number(e.target.value) })}
              className="h-1 w-full accent-white"
            />
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-white/40">Copy</p>
          <input
            value={theme.headline}
            onChange={(e) => set({ headline: e.target.value })}
            placeholder="Headline"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-white/30 focus:outline-none"
          />
          <textarea
            value={theme.subheadline}
            onChange={(e) => set({ subheadline: e.target.value })}
            placeholder="Subheadline"
            rows={2}
            className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-white/30 focus:outline-none"
          />
        </section>
      </div>

      <div className="flex gap-2 border-t border-white/10 px-4 py-3">
        <button
          onClick={() => onChange({ ...DEFAULT_THEME })}
          className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2.5 text-[11px] text-white/60 hover:bg-white/10 hover:text-white"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#1b1a1a] transition-all hover:brightness-110 disabled:opacity-50"
          style={{ backgroundColor: theme.accent_color }}
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {saving ? "Saving..." : "Save theme"}
        </button>
      </div>
    </motion.aside>
  );
}