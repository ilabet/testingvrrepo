import React from "react";
import { Flower, Flower2, Swords, Heart } from "lucide-react";

const GLYPHS = { lotus: Flower2, sword: Swords, lily: Flower, bow: Heart };

export default function LoginOrnament({ type, color, position }) {
  const Glyph = GLYPHS[type];
  if (!Glyph) return null;

  return (
    <div
      className={`pointer-events-none absolute left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 ${
        position === "top" ? "-top-3" : "-bottom-3"
      }`}
    >
      <span className="h-px w-10 opacity-40" style={{ backgroundColor: color }} />
      <span
        className="grid h-6 w-6 place-items-center rounded-full bg-[#0b0810]"
        style={{ color, border: `1px solid ${color}`, boxShadow: `0 0 12px ${color}80` }}
      >
        <Glyph className="h-3.5 w-3.5" />
      </span>
      <span className="h-px w-10 opacity-40" style={{ backgroundColor: color }} />
    </div>
  );
}