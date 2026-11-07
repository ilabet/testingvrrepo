import React, { useState, useRef, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import VirtualJoystick from "@/components/viewer/VirtualJoystick";
import LeftToolbar from "@/components/viewer/LeftToolbar";
import RightToolbar from "@/components/viewer/RightToolbar";
import ChatPanel from "@/components/viewer/ChatPanel";
import InventoryPanel from "@/components/viewer/InventoryPanel";
import ProfilePanel from "@/components/viewer/ProfilePanel";
import MapPanel from "@/components/viewer/MapPanel";
import PeoplePanel from "@/components/viewer/PeoplePanel";
import MiniMap from "@/components/viewer/MiniMap";
import AppearancePanel from "@/components/viewer/AppearancePanel";
import WorldScene from "@/components/viewer/WorldScene";
import XRButton from "@/components/viewer/XRButton";
import { useWorldStream } from "@/hooks/useWorldStream";
import { base44 } from "@/api/base44Client";

export default function Viewer() {
  const [activeTool, setActiveTool] = useState(null);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [renderer, setRenderer] = useState(null);
  const joystickInput = useRef({ x: 0, y: 0 });

  // Live world-stream proxy connection (empty = sandbox scene fallback)
  const wsUrl = localStorage.getItem("sl_ws_url") || "";

  // Alert Discord when the live proxy connection drops unexpectedly
  const handleStreamDrop = useCallback((info) => {
    base44.functions
      .invoke("stream_drop_alert", { proxy_url: wsUrl, reason: info?.reason || "connection lost" })
      .catch(() => {});
  }, [wsUrl]);

  const { connected, send } = useWorldStream(wsUrl, handleStreamDrop);

  const handleJoystickMove = useCallback((pos) => {
    joystickInput.current = pos;
    // Relay movement to the live proxy when connected
    if (connected) {
      send({ type: "agent_update", x: pos.x, y: pos.y, vel_x: pos.x, vel_y: pos.y, vel_z: 0, yaw: 0, running: false, flying: false });
    }
  }, [connected, send]);

  const handleToolSelect = (toolId) => {
    if (toolId === "minimap") {
      setShowMiniMap((prev) => !prev);
      return;
    }
    setActiveTool((prev) => (prev === toolId ? null : toolId));
  };

  const closeTool = () => setActiveTool(null);

  // Panels that correspond to left-side tools
  const renderPanel = () => {
    switch (activeTool) {
      case "inventory":
        return <InventoryPanel onClose={closeTool} />;
      case "profile":
        return <ProfilePanel onClose={closeTool} />;
      case "map":
        return <MapPanel onClose={closeTool} />;
      case "people":
        return <PeoplePanel onClose={closeTool} />;
      case "chat":
        return <ChatPanel onClose={closeTool} />;
      default:
        // For appearance via profile's edit
        if (activeTool === "settings") {
          return <AppearancePanel onClose={closeTool} />;
        }
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none">
      {/* 3D World */}
      <WorldScene joystickInput={joystickInput} onRendererReady={setRenderer} />
      <XRButton renderer={renderer} />

      {/* Left toolbar (top bar controls from PC viewer) */}
      <LeftToolbar onToolSelect={handleToolSelect} activeTool={activeTool} />

      {/* Right toolbar (bottom bar controls from PC viewer) */}
      <RightToolbar onToolSelect={handleToolSelect} activeTool={activeTool} />

      {/* Mini map */}
      <AnimatePresence>
        {showMiniMap && <MiniMap />}
      </AnimatePresence>

      {/* Active panel */}
      <AnimatePresence>{renderPanel()}</AnimatePresence>

      {/* Location bar */}
      <div className="fixed top-3 left-14 right-14 z-20 flex justify-center pointer-events-none">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 pointer-events-auto flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-400" : "bg-gray-500"}`} />
          <p className="text-white/60 text-[10px] text-center">
            {connected ? "LIVE • Second Life" : "Sandbox • Welcome Island (128, 128, 25)"} • FPS: 60
          </p>
        </div>
      </div>

      {/* Virtual joystick */}
      <div className="fixed bottom-4 left-4 z-30">
        <VirtualJoystick onMove={handleJoystickMove} size={110} />
      </div>

      {/* Action buttons (jump, fly, sit) */}
      <div className="fixed bottom-4 right-14 z-30 flex flex-col gap-2">
        <button className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/60 text-xs font-bold hover:text-white hover:bg-black/60 transition-all active:scale-95">
          FLY
        </button>
        <button className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/60 text-xs font-bold hover:text-white hover:bg-black/60 transition-all active:scale-95">
          JMP
        </button>
        <button className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/60 text-xs font-bold hover:text-white hover:bg-black/60 transition-all active:scale-95">
          SIT
        </button>
      </div>
    </div>
  );
}