import React from "react";
import { Image } from "@/components/ui/image";
import { APP_LOGO } from "@/components/login/loginTheme";

export default function LoginBrandPanel({ headline, subheadline, accent }) {
  return (
    <div className="hidden flex-col justify-between border-r border-white/10 bg-gradient-to-b from-neon-purple/15 via-transparent to-neon-pink/15 p-5 md:flex">
      <div>
        <Image
          src={APP_LOGO}
          alt="Second Life Go"
          fittingType="fit"
          className="h-20 w-20 drop-shadow-[0_0_25px_rgba(236,72,153,0.45)]"
        />
        <h1 className="mt-4 font-serif text-2xl font-bold leading-tight text-white">{headline}</h1>
        <p className="mt-2 text-xs leading-relaxed text-white/50">{subheadline}</p>
      </div>

      <div className="mt-6 space-y-1.5 text-[10px] text-white/35">
        <p className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
          Grid credentials only
        </p>
        <p>Second Life Go · v1.0.0</p>
      </div>
    </div>
  );
}