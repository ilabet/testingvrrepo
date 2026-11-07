import React from "react";
import { Image } from "@/components/ui/image";

export default function LoginBackdrop({ theme }) {
  const dim = (theme.dim ?? 55) / 100;
  const blur = theme.blur ?? 0;
  const hasMedia = Boolean(theme.background_url) && theme.background_type !== "gradient";

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base charcoal wash */}
      <div className="absolute inset-0 bg-[#3a3737]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#4a4646] via-[#333030] to-[#171616]" />

      {/* User media */}
      {hasMedia && (
        <div className="absolute inset-0" style={{ filter: blur ? `blur(${blur}px)` : undefined }}>
          {theme.background_type === "video" ? (
            <video
              src={theme.background_url}
              className="h-full w-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <Image
              src={theme.background_url}
              alt=""
              fittingType="fill"
              className="h-full w-full object-cover"
            />
          )}
        </div>
      )}

      {/* Accent bloom */}
      <div
        className="absolute -top-32 right-0 h-[420px] w-[420px] rounded-full blur-3xl opacity-25"
        style={{ backgroundColor: theme.accent_color || "#f4c7d0" }}
      />

      {/* Dim + contrast wash */}
      <div className="absolute inset-0" style={{ backgroundColor: `rgba(12,11,11,${dim})` }} />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0c0c] via-transparent to-[#0d0c0c]/60" />
    </div>
  );
}