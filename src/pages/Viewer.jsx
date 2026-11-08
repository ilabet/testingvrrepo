import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
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

  const stream = useWorldStream(wsUrl, handleStreamDrop);
  const { connected, send, on } = stream;

  // Bridge origin for texture/mesh downloads (wss://host/stream -> https://host)
  const liveOrigin = useMemo(() => {
    try {
      const u = new URL(wsUrl);
      return `${u.protocol === "wss:" ? "https" : "http"}://${u.host}`;
    } catch {
      return "";
    }
  }, [wsUrl]);

  const [region, setRegion] = useState("");
  const [chatLog, setChatLog] = useState([{ id: 0, sender: "System", text: "Welcome to the region.", time: "now", system: true }]);
  const [notices, setNotices] = useState([]);
  const addChat = useCallback((entry) => {
    setChatLog((prev) => [...prev.slice(-199), { id: `${Date.now()}-${Math.random()}`, time: "now", ...entry }]);
  }, []);

  useEffect(() => {
    on("chat", (m) => addChat({ sender: m.from, text: m.text }));
    on("im", (m) => {
      addChat({ sender: `[IM] ${m.from}`, text: m.text });
      setNotices((prev) => [...prev, { id: `im-${m.fromId}-${Date.now()}`, title: `IM from ${m.from}: ${m.text}`, buttons: [{ label: "Dismiss" }] }]);
    });
    on("teleport", (m) => m.message && addChat({ sender: "System", text: m.message, system: true }));
    on("disconnected", (m) => addChat({ sender: "System", text: m.message || "Disconnected from Second Life", system: true }));
    on("error", (m) => addChat({ sender: "System", text: m.message, system: true }));
    on("loginOk", (m) => m.message && addChat({ sender: "System", text: m.message, system: true }));
    on("lure", (m) =>
      setNotices((prev) => [...prev, { id: m.id, title: `${m.from} offers a teleport: ${m.text || ""}`, buttons: [{ label: "Accept", msg: { type: "acceptLure", id: m.id } }, { label: "Decline" }] }])
    );
    on("dialog", (m) =>
      setNotices((prev) => [
        ...prev,
        { id: m.id, title: `${m.object}: ${m.text}`, buttons: [...m.buttons.map((b, i) => ({ label: b, msg: { type: "dialogReply", id: m.id, index: i } })), { label: "Ignore" }] },
      ])
    );
  }, [on, addChat]);

  const answerNotice = (notice, button) => {
    if (button.msg) send(button.msg);
    setNotices((prev) => prev.filter((n) => n.id !== notice.id));
  };

  const sendChat = useCallback((text) => {
    const tp = text.match(/^\/tp\s+(.+)$/);
    if (tp) {
      const [name, x, y, z] = tp[1].split("/").map((v) => v.trim());
      send({ type: "teleport", region: name, pos: [Number(x) || 128, Number(y) || 128, Number(z) || 30] });
      addChat({ sender: "System", text: `Teleporting to ${name}...`, system: true });
      return;
    }
    if (text === "/home") return send({ type: "home" });
    if (text.startsWith("/shout ")) return send({ type: "chat", text: text.slice(7), mode: "shout" });
    if (text.startsWith("/whisper ")) return send({ type: "chat", text: text.slice(9), mode: "whisper" });
    const ch = text.match(/^\/(\d+)\s+(.*)$/);
    if (ch) return send({ type: "chat", text: ch[2], channel: Number(ch[1]) });
    send({ type: "chat", text });
  }, [send, addChat]);

  const slAction = (action) => window.dispatchEvent(new CustomEvent("sl-action", { detail: { action } }));

  const handleJoystickMove = useCallback((pos) => {
    joystickInput.current = pos;
  }, []);

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
        return connected ? <ChatPanel onClose={closeTool} messages={chatLog} onSend={sendChat} /> : <ChatPanel onClose={closeTool} />;
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
      <WorldScene
        joystickInput={joystickInput}
        onRendererReady={setRenderer}
        onSelectTool={handleToolSelect}
        statusText={connected ? `LIVE · ${region || "Second Life"}` : "Sandbox · Welcome Island"}
        stream={stream}
        liveOrigin={liveOrigin}
        onLiveStatus={setRegion}
      />
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
            {connected ? `LIVE • ${region || "Second Life"}` : "Sandbox • Welcome Island (128, 128, 25)"} • FPS: 60
          </p>
        </div>
      </div>

      {/* Live notifications: teleport offers, script dialogs, IMs */}
      {notices.length > 0 && (
        <div className="fixed top-14 right-14 z-40 flex w-72 flex-col gap-2">
          {notices.slice(-3).map((n) => (
            <div key={n.id} className="rounded-xl border border-white/10 bg-black/70 p-3 text-xs text-white/80 backdrop-blur-md">
              <p className="mb-2">{n.title}</p>
              <div className="flex flex-wrap gap-1.5">
                {n.buttons.map((b) => (
                  <button key={b.label} onClick={() => answerNotice(n, b)} className="rounded-md bg-neon-purple/30 px-2 py-1 text-white hover:bg-neon-purple/50">
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Virtual joystick */}
      <div className="fixed bottom-4 left-4 z-30">
        <VirtualJoystick onMove={handleJoystickMove} size={110} />
      </div>

      {/* Action buttons (jump, fly, sit) */}
      <div className="fixed bottom-4 right-14 z-30 flex flex-col gap-2">
        <button onClick={() => slAction("fly")} className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/60 text-xs font-bold hover:text-white hover:bg-black/60 transition-all active:scale-95">
          FLY
        </button>
        <button onClick={() => slAction("jump")} className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/60 text-xs font-bold hover:text-white hover:bg-black/60 transition-all active:scale-95">
          JMP
        </button>
        <button onClick={() => slAction("stand")} className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/60 text-xs font-bold hover:text-white hover:bg-black/60 transition-all active:scale-95">
          SIT
        </button>
      </div>
    </div>
  );
}