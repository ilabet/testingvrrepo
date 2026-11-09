import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Send, Hash, Globe, Users } from "lucide-react";

const CHANNELS = [
  { id: "local", label: "Local Chat", icon: Globe },
  { id: "group", label: "Group Chat", icon: Users },
  { id: "im", label: "IM", icon: Hash },
];

export default function ChatPanel({ onClose, messages: liveMessages, onSend }) {
  const [messages, setMessages] = useState([
    { id: 1, sender: "System", text: "Welcome to the region.", time: "now", system: true },
  ]);
  const shown = liveMessages ?? messages;
  const [input, setInput] = useState("");
  const [channel, setChannel] = useState("local");
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [shown]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (onSend) {
      onSend(input.trim(), channel);
      setInput("");
      return;
    }
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: "You", text: input, time: "now" },
    ]);
    setInput("");
  };

  const activeChannel = CHANNELS.find((c) => c.id === channel);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-14 left-2 right-2 sm:left-auto sm:right-14 sm:w-80 z-50 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      style={{ maxHeight: "50vh" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          {CHANNELS.map((ch) => {
            const Icon = ch.icon;
            return (
              <button
                key={ch.id}
                onClick={() => setChannel(ch.id)}
                className={`p-1.5 rounded-lg transition-all ${channel === ch.id ? "bg-neon-purple/20 text-neon-purple" : "text-white/40 hover:text-white/70"}`}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
          <span className="text-white/60 text-xs ml-1">{activeChannel?.label}</span>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="p-3 space-y-2 overflow-y-auto" style={{ maxHeight: "30vh" }}>
        {shown.map((msg) => (
          <div key={msg.id} className={msg.system ? "text-center" : ""}>
            {msg.system ? (
              <p className="text-gray-500 text-xs italic">{msg.text}</p>
            ) : (
              <div>
                <span className="text-neon-pink text-xs font-medium">{msg.sender}: </span>
                <span className="text-white/80 text-xs">{msg.text}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex items-center gap-2 p-2 border-t border-white/5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Say something..."
          className="flex-1 bg-white/5 rounded-xl px-3 py-2 text-white text-xs placeholder-gray-500 focus:outline-none focus:bg-white/10"
        />
        <button type="submit" className="p-2 text-neon-purple hover:text-neon-pink">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </motion.div>
  );
}