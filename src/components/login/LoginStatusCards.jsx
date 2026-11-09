import React from "react";
import { Globe, Radio, Clock, BellRing } from "lucide-react";

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export default function LoginStatusCards({ gridLabel, proxyUrl, lastSession, accent }) {
  const cards = [
    {
      icon: Globe,
      label: "Your grid",
      value: gridLabel || "Second Life",
      sub: "Credentials go straight to the grid login server",
    },
    {
      icon: Radio,
      label: "Stream proxy",
      value: proxyUrl ? "Custom bridge" : "This server",
      sub: hostOf(proxyUrl || window.location.origin),
    },
    {
      icon: Clock,
      label: "Last session",
      value: lastSession
        ? lastSession.avatar_name ||
          [lastSession.first_name, lastSession.last_name].filter(Boolean).join(" ")
        : "No recent session",
      sub: lastSession?.last_location || "Your last location shows here",
    },
    {
      icon: BellRing,
      label: "Alerts",
      value: "No active alerts",
      sub: "The bridge can ping Discord if the stream drops",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.02] p-4 backdrop-blur-xl"
          >
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4" style={{ color: accent }} />
              <span className="text-[10px] uppercase tracking-wider text-white/40">{card.label}</span>
            </div>
            <p className="mt-2 truncate text-sm font-semibold text-white">{card.value}</p>
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-white/40">{card.sub}</p>
          </div>
        );
      })}
    </div>
  );
}