import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Globe, ChevronDown, LogIn, Eye, EyeOff } from "lucide-react";
import { loadJson, saveJson } from "@/lib/localStore";
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
  { id: "demo", label: "Demo World (no account)" },
];

const INPUT =
  "w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder-white/25 transition-colors focus:border-neon-pink/60 focus:outline-none focus:ring-1 focus:ring-neon-pink/30";

const THEME_KEY = "sl_login_theme";
const MAX_UPLOAD_BYTES = 3 * 1048576;

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
  const [showCustomize, setShowCustomize] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [infoMode, setInfoMode] = useState(null);
  const [lastSession, setLastSession] = useState(null);

  useEffect(() => {
    const saved = loadJson(THEME_KEY, null);
    if (saved) setTheme({ ...DEFAULT_THEME, ...saved });
    setLastSession(loadJson("sl_session", null));
  }, []);

  // Uploads stay in this browser as data URLs, so keep them small enough for localStorage.
  const handleUpload = async (file, kind = "background") => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`That file is ${(file.size / 1048576).toFixed(1)} MB; uploads are limited to ${MAX_UPLOAD_BYTES / 1048576} MB.`);
      return;
    }
    setUploading(true);
    try {
      const fileUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      if (kind === "logo") {
        setTheme((t) => ({ ...t, logo_url: fileUrl }));
      } else {
        setTheme((t) => ({
          ...t,
          background_url: fileUrl,
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
      if (!saveJson(THEME_KEY, { ...theme, dim: Number(theme.dim), blur: Number(theme.blur) })) {
        setError("This browser's storage is full: use a smaller background or logo.");
        return;
      }
      setShowCustomize(false);
    } finally {
      setSavingTheme(false);
    }
  };

  // Logs in through the bridge: the one serving this page, or another one (it allows cross-origin requests).
  const proxyLogin = async ({ proxy_base_url, ...body }) => {
    const endpoint = proxy_base_url.replace(/\/+$/, "").replace(/\/(login|health)$/, "") + "/login";
    let resp;
    try {
      resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, first_name: body.first_name || "Demo" }),
      });
    } catch {
      return { success: false, message: `Could not reach the bridge at ${endpoint}` };
    }
    const text = await resp.text();
    try {
      return JSON.parse(text);
    } catch {
      return {
        success: false,
        message: `The proxy URL answered with HTTP ${resp.status}, not the Second Life bridge. Use your Railway domain, e.g. https://<name>.up.railway.app`,
      };
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const bridgeUrl = proxyUrl.trim() || window.location.origin;
      const data = await proxyLogin({
        proxy_base_url: bridgeUrl,
        first_name: firstName,
        last_name: lastName || "Resident",
        password,
        grid,
        custom_login_uri: customLoginUri,
      });
      const ok = data.success !== false && (data.ws_url || data.websocket_url || data.agent_id || data.success === true);
      if (ok) {
        localStorage.setItem("sl_ws_url", data.ws_url || data.websocket_url || "");
        localStorage.setItem("sl_proxy_url", proxyUrl.trim());
        localStorage.setItem(
          "sl_session",
          JSON.stringify({
            first_name: firstName,
            last_name: lastName || "Resident",
            grid,
            agent_id: data.agent_id || null,
            avatar_name: data.avatar_name || null,
            last_location: data.region || null,
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
      const msg = err?.message || "Could not reach the bridge";
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
            canCustomize
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
                        <div className="mt-1 overflow-hidden rounded-md border border-white/10 bg-[#140f1c] shadow-xl">
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
                      Bridge server (optional)
                    </summary>
                    <div className="mt-2">
                      <label className={LABEL}>Proxy server URL</label>
                      <input
                        type="text"
                        value={proxyUrl}
                        onChange={(e) => setProxyUrl(e.target.value)}
                        placeholder={window.location.origin}
                        className={INPUT}
                      />
                      <p className="mt-1 text-[10px] text-white/35">
                        Leave empty to use this server. Enter another bridge URL only if you run your own elsewhere.
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