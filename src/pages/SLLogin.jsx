import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Globe, ChevronDown, LogIn, Eye, EyeOff } from "lucide-react";
import { base44 } from "@/api/base44Client";
import LoginBackdrop from "@/components/login/LoginBackdrop";
import LoginWindow from "@/components/login/LoginWindow";
import LoginBrandPanel from "@/components/login/LoginBrandPanel";
import LoginStatusCards from "@/components/login/LoginStatusCards";
import LoginMusicPlayer from "@/components/login/LoginMusicPlayer";
import LoginDiscordBadge from "@/components/login/LoginDiscordBadge";
import { FRAME_PRESETS } from "@/lib/framePresets";
import LoginCustomizePanel from "@/components/login/LoginCustomizePanel";
import LoginInfoDialog from "@/components/login/LoginInfoDialog";
import { DEFAULT_THEME } from "@/components/login/loginTheme";

const GRIDS = [
  { id: "agni", label: "Second Life (Main Grid)" },
  { id: "aditi", label: "Second Life (Beta Grid)" },
  { id: "osgrid", label: "OSGrid" },
  { id: "custom", label: "Custom Grid..." },
  { id: "demo", label: "Demo World (no account, needs proxy)" },
];

const INPUT =
  "w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder-white/25 transition-colors focus:border-neon-pink/60 focus:outline-none focus:ring-1 focus:ring-neon-pink/30";

const LABEL = "mb-1 block text-[10px] uppercase tracking-wider text-white/40";

export default function SLLogin() {
  const navigate = useNavigate();

  // ---- Entry form state (unchanged login behaviour) ----
  const [firstName, setFirstName] = useState(() => localStorage.getItem("sl_remember_name") || "");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [grid, setGrid] = useState("agni");
  const [customLoginUri, setCustomLoginUri] = useState("");
  const [proxyUrl, setProxyUrl] = useState(() => localStorage.getItem("sl_proxy_url") || "");
  const [showGrid, setShowGrid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberName, setRememberName] = useState(() => Boolean(localStorage.getItem("sl_remember_name")));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ---- Page customization ----
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [themeRecord, setThemeRecord] = useState(null);
  const [showCustomize, setShowCustomize] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [infoMode, setInfoMode] = useState(null);
  const [lastSession, setLastSession] = useState(null);
  const [ownerSignedIn, setOwnerSignedIn] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(setOwnerSignedIn).catch(() => {});

    base44.entities.LoginTheme.list({ sort: "-updated_date", limit: 1 })
      .then((page) => {
        if (!page.items.length) return;
        const rec = page.items[0];
        setThemeRecord(rec);
        setTheme({
          background_type: rec.background_type || DEFAULT_THEME.background_type,
          background_url: rec.background_url || "",
          accent_color: rec.accent_color || DEFAULT_THEME.accent_color,
          dim: rec.dim ?? DEFAULT_THEME.dim,
          blur: rec.blur ?? DEFAULT_THEME.blur,
          headline: rec.headline || DEFAULT_THEME.headline,
          subheadline: rec.subheadline || DEFAULT_THEME.subheadline,
          logo_url: rec.logo_url || "",
          frame_style: rec.frame_style || "none",
          music_url: rec.music_url || "",
          music_title: rec.music_title || "",
        });
      })
      .catch(() => {});

    base44.entities.SLSession.list({ sort: "-created_date", limit: 1 })
      .then((page) => setLastSession(page.items[0] || null))
      .catch(() => {});
  }, []);

  const handleUpload = async (file, kind = "background") => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      if (kind === "logo") {
        setTheme((t) => ({ ...t, logo_url: file_url }));
      } else {
        setTheme((t) => ({
          ...t,
          background_url: file_url,
          background_type: file.type.startsWith("video") ? "video" : "image",
        }));
      }
    } finally {
      setUploading(false);
    }
  };

  const saveTheme = async () => {
    setSavingTheme(true);
    try {
      const payload = {
        background_type: theme.background_type,
        background_url: theme.background_url,
        accent_color: theme.accent_color,
        dim: Number(theme.dim),
        blur: Number(theme.blur),
        headline: theme.headline,
        subheadline: theme.subheadline,
        logo_url: theme.logo_url,
        frame_style: theme.frame_style,
        music_url: theme.music_url,
        music_title: theme.music_title,
      };
      if (themeRecord) {
        const updated = await base44.entities.LoginTheme.update(themeRecord.id, payload);
        setThemeRecord(updated);
      } else {
        const created = await base44.entities.LoginTheme.create(payload);
        setThemeRecord(created);
      }
      setShowCustomize(false);
    } finally {
      setSavingTheme(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // If a live proxy is configured, log in through it (full world stream);
      // otherwise use the direct grid login bridge.
      const usingProxy = Boolean(proxyUrl.trim());
      if (grid === "demo" && !usingProxy) {
        setError("The demo world runs on the live world proxy: enter its URL first.");
        return;
      }
      const fnName = usingProxy ? "sl_proxy_connect" : "sl_connect";
      const payload = usingProxy
        ? { proxy_base_url: proxyUrl.trim(), first_name: firstName, last_name: lastName || "Resident", password, grid, custom_login_uri: customLoginUri }
        : { first_name: firstName, last_name: lastName || "Resident", password, grid, custom_login_uri: customLoginUri };
      const response = await base44.functions.invoke(fnName, payload);
      const data = response.data;
      const ok = data.success !== false && (data.ws_url || data.websocket_url || data.agent_id || data.success === true);
      if (ok) {
        if (usingProxy) {
          const ws = data.ws_url || data.websocket_url || "";
          if (ws) localStorage.setItem("sl_ws_url", ws);
        } else {
          localStorage.removeItem("sl_ws_url");
        }
        localStorage.setItem("sl_proxy_url", proxyUrl.trim());
        localStorage.setItem(
          "sl_session",
          JSON.stringify({
            first_name: firstName,
            last_name: lastName || "Resident",
            grid,
            agent_id: data.agent_id || null,
            session_id: data.session_id || null,
            signed_in_at: new Date().toISOString(),
          })
        );
        if (rememberName && firstName) {
          localStorage.setItem("sl_remember_name", firstName);
        } else {
          localStorage.removeItem("sl_remember_name");
        }
        navigate("/orientation-check");
      } else {
        setError(data.message || data.error || "Login failed");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Could not reach the grid login server";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectedGrid = GRIDS.find((g) => g.id === grid);
  const accent = theme.accent_color || DEFAULT_THEME.accent_color;
  const frame = FRAME_PRESETS[theme.frame_style] || FRAME_PRESETS.none;

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#08060f] text-white">
      <LoginBackdrop theme={theme} />

      <div className="relative z-10 flex min-h-full flex-col justify-center px-3 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <LoginWindow
            gridLabel={selectedGrid?.label}
            loading={loading}
            onViewer={() => navigate("/mobile")}
            onHelp={() => setInfoMode("help")}
            onDebug={() => setInfoMode("debug")}
            canCustomize={ownerSignedIn}
            onCustomize={() => setShowCustomize(true)}
            onOwnerLogin={() => navigate("/login")}
            logoUrl={theme.logo_url}
            frameStyle={theme.frame_style}
          >
            <div className="grid md:grid-cols-[240px_1fr]">
              <LoginBrandPanel
                headline={theme.headline}
                subheadline={theme.subheadline}
                accent={accent}
                logoUrl={theme.logo_url}
                brandGradient={frame.brand}
              />

              <div className="p-4 sm:p-5">
                <div className="mb-4 md:hidden">
                  <h1 className="font-serif text-2xl font-bold leading-tight text-white">{theme.headline}</h1>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/50">{theme.subheadline}</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-3">
                  {/* Account */}
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <p className="mb-2 text-[9px] uppercase tracking-[0.2em] text-neon-pink/70">Account</p>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={LABEL}>First name</label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="First"
                          required={grid !== "demo"}
                          className={INPUT}
                        />
                      </div>
                      <div>
                        <label className={LABEL}>Last name</label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Resident"
                          required={grid !== "demo"}
                          className={INPUT}
                        />
                      </div>
                    </div>

                    <div className="mt-2">
                      <label className={LABEL}>Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required={grid !== "demo"}
                          className={`${INPUT} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/35 transition-colors hover:text-neon-pink"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <label className="mt-2.5 flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={rememberName}
                        onChange={(e) => setRememberName(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-white/20 bg-white/10 accent-[#ec4899]"
                      />
                      <span className="text-[11px] text-white/45">Remember username</span>
                    </label>
                  </div>

                  {/* Grid */}
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <p className="mb-2 text-[9px] uppercase tracking-[0.2em] text-neon-blue/80">Grid</p>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowGrid(!showGrid)}
                        className="flex w-full items-center justify-between rounded-md border border-white/10 bg-black/50 px-3 py-2 text-left text-sm text-white transition-colors hover:border-white/20"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Globe className="h-4 w-4 shrink-0" style={{ color: accent }} />
                          <span className="truncate">{selectedGrid?.label}</span>
                        </span>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-white/40 transition-transform ${showGrid ? "rotate-180" : ""}`} />
                      </button>

                      {showGrid && (
                        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-white/10 bg-[#140f1c] shadow-xl">
                          {GRIDS.map((g) => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => { setGrid(g.id); setShowGrid(false); }}
                              className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-white/10 ${
                                grid === g.id ? "bg-neon-purple/20 text-white" : "text-white/60"
                              }`}
                            >
                              {g.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {grid === "custom" && (
                      <div className="mt-2">
                        <label className={LABEL}>Login URI</label>
                        <input
                          type="text"
                          value={customLoginUri}
                          onChange={(e) => setCustomLoginUri(e.target.value)}
                          placeholder="http://grid.example.com:8002/cgi-bin/login.cgi"
                          required
                          className={INPUT}
                        />
                      </div>
                    )}
                  </div>

                  <details className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                    <summary className="cursor-pointer select-none text-[11px] text-white/50">
                      Live world proxy (optional)
                    </summary>
                    <div className="mt-2">
                      <label className={LABEL}>Proxy server URL</label>
                      <input
                        type="text"
                        value={proxyUrl}
                        onChange={(e) => setProxyUrl(e.target.value)}
                        placeholder="https://your-service.up.railway.app"
                        className={INPUT}
                      />
                      <p className="mt-1 text-[10px] text-white/35">
                        Leave empty for the sandbox scene. Enter your VPS proxy URL to stream the live SL world.
                      </p>
                    </div>
                  </details>

                  {error && (
                    <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2">
                      <p className="text-xs leading-relaxed text-red-300">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-neon-purple via-neon-pink to-neon-blue py-3 text-sm font-semibold tracking-wide text-white shadow-[0_0_30px_-8px_rgba(236,72,153,0.9)] transition-all hover:brightness-110 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <LogIn className="h-4 w-4" />
                        Log In
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </LoginWindow>

          <div className="mt-3">
            <LoginStatusCards
              gridLabel={selectedGrid?.label}
              proxyUrl={proxyUrl}
              lastSession={lastSession}
              accent={accent}
            />
          </div>

          <div className="mt-3 flex justify-center">
            <LoginDiscordBadge accent={accent} />
          </div>

          <p className="mt-3 text-center text-[10px] text-white/25">
            Powered by Second Life Go · Your credentials go straight to the grid login server
          </p>
        </div>
      </div>

      <LoginMusicPlayer url={theme.music_url} title={theme.music_title} />

      <AnimatePresence>
        {showCustomize && (
          <LoginCustomizePanel
            theme={theme}
            onChange={setTheme}
            onSave={saveTheme}
            onClose={() => setShowCustomize(false)}
            onUpload={handleUpload}
            saving={savingTheme}
            uploading={uploading}
          />
        )}
      </AnimatePresence>

      {infoMode && (
        <LoginInfoDialog mode={infoMode} proxyUrl={proxyUrl} onClose={() => setInfoMode(null)} />
      )}
    </div>
  );
}