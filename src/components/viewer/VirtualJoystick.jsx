import React, { useRef, useState, useCallback } from "react";

export default function VirtualJoystick({ onMove, size = 120 }) {
  const baseRef = useRef(null);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const touchId = useRef(null);

  const maxDist = size / 2 - 15;

  const handleStart = useCallback((e) => {
    e.preventDefault();
    const touch = e.changedTouches?.[0] || e;
    touchId.current = touch.identifier ?? -1;
    setActive(true);
    handleMove(e);
  }, []);

  const handleMove = useCallback((e) => {
    e.preventDefault();
    const touch = e.changedTouches
      ? Array.from(e.changedTouches).find((t) => t.identifier === touchId.current)
      : e;
    if (!touch || !baseRef.current) return;

    const rect = baseRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = touch.clientX - cx;
    let dy = touch.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }
    setStickPos({ x: dx, y: dy });
    onMove?.({ x: dx / maxDist, y: -dy / maxDist });
  }, [maxDist, onMove]);

  const handleEnd = useCallback((e) => {
    e.preventDefault();
    touchId.current = null;
    setActive(false);
    setStickPos({ x: 0, y: 0 });
    onMove?.({ x: 0, y: 0 });
  }, [onMove]);

  return (
    <div
      ref={baseRef}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onMouseDown={handleStart}
      onMouseMove={active ? handleMove : undefined}
      onMouseUp={handleEnd}
      onMouseLeave={active ? handleEnd : undefined}
      className="relative select-none touch-none"
      style={{ width: size, height: size }}
    >
      {/* Base ring */}
      <div className="absolute inset-0 rounded-full border-2 border-white/15 bg-black/20 backdrop-blur-sm" />
      {/* Stick */}
      <div
        className="absolute w-12 h-12 rounded-full bg-white/25 border-2 border-white/30 shadow-lg transition-transform duration-75"
        style={{
          left: "50%",
          top: "50%",
          transform: `translate(calc(-50% + ${stickPos.x}px), calc(-50% + ${stickPos.y}px))`,
        }}
      />
    </div>
  );
}