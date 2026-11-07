import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Globe, ChevronDown, LogIn, Eye, EyeOff, Palette } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import LoginBackdrop from "@/components/login/LoginBackdrop";
import LoginTopBar from "@/components/login/LoginTopBar";
import LoginStatusCards from "@/components/login/LoginStatusCards";
import LoginCustomizePanel from "@/components/login/LoginCustomizePanel";
import LoginInfoDialog from "@/components/login/LoginInfoDialog";
import { DEFAULT_THEME, APP_LOGO } from "@/components/login/loginTheme";

const GRIDS = [
  { id: "agni", label: "Second Life (Main Grid)" },
  { id: "aditi", label: "Second Life (Beta Grid)" },
  { id: "osgrid", label: "OSGrid" },
  { id: "custom", label: "Custom Grid..." },
];

const INPUT =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 transition-all focus:border-white/35 focus:bg-white/10 focus:outline-none";

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
        });
      })
      .catch(() => {});

    base44.entities.SLSession.list({ sort: "-created_date", limit: 1 })
      .then((page) => setLastSession(page.items[0] || null))
      .catch(() => {});
  }, []);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setTheme((t) => ({
        ...t,
        background_url: file_url,
        background_type: file.type.startsWith("video") ? "video" : "image",
      }));
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

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#2b2828] text-white">
      <LoginBackdrop theme={theme} />

      <div className="relative z-10 flex min-h-full flex-col">
        <LoginTopBar
          onViewer={() => navigate("/mobile")}
          onHelp={() => setInfoMode("help")}
          onDebug={() => setInfoMode("debug")}
          onCustomize={() => setShowCustomize(true)}
          canCustomize={ownerSignedIn}
          onOwnerLogin={() => navigate("/login")}
        />

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-10 sm:px-6">
          <LoginStatusCards
            gridLabel={selectedGrid?.label}
            proxyUrl={proxyUrl}
            lastSession={lastSession}
            accent={accent}
          />

          <div className="relative mt-10 flex justify-center">
            {/* Faint brand mark behind the entry card */}
            <Image
              src={APP_LOGO}
              alt=""
              fittingType="fit"
              className="pointer-events-none absolute -top-16 left-1/2 h-[380px] w-[380px] -translate-x-1/2 opacity-[0.06]"
            />

            <div className="relative w-full max-w-md">
              <div className="mb-6 text-center">
                <h1 className="font-serif text-3xl font-bold leading-tight text-white sm:text-4xl">
                  {theme.headline}
                </h1>
                <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-white/55 sm:text-sm">
                  {theme.subheadline}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/45 p-5 shadow-2xl backdrop-blur-2xl sm:p-6">
                <form onSubmit={handleLogin} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block pl-1 text-[10px] uppercase tracking-wider text-white/40">First name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First"
                        required
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block pl-1 text-[10px] uppercase tracking-wider text-white/40">Last name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Resident"
                        required
                        className={INPUT}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block pl-1 text-[10px] uppercase tracking-wider text-white/40">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className={`${INPUT} pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/80"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block pl-1 text-[10px] uppercase tracking-wider text-white/40">Grid</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowGrid(!showGrid)}
                        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white transition-all hover:bg-white/10"
                      >
                        <span className="flex items-center gap-2">
                          <Globe className="h-4 w-4" style={{ color: accent }} />
                          {selectedGrid?.label}
                        </span>
                        <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${showGrid ? "rotate-180" : ""}`} />
                      </button>

                      {showGrid && (
                        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-white/10 bg-[#1c1a1a] shadow-xl">
                          {GRIDS.map((g) => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => { setGrid(g.id); setShowGrid(false); }}
                              className={`w-full px-4 py-3 text-left text-sm transition-colors hover:bg-white/10 ${
                                grid === g.id ? "bg-white/10 text-white" : "text-white/60"
                              }`}
                            >
                              {g.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {grid === "custom" && (
                    <div>
                      <label className="mb-1 block pl-1 text-[10px] uppercase tracking-wider text-white/40">Login URI</label>
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

                  <details className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    <summary className="cursor-pointer select-none text-[11px] text-white/50">
                      Live world proxy (optional)
                    </summary>
                    <div className="mt-2">
                      <label className="mb-1 block pl-1 text-[10px] uppercase tracking-wider text-white/40">Proxy server URL</label>
                      <input
                        type="text"
                        value={proxyUrl}
                        onChange={(e) => setProxyUrl(e.target.value)}
                        placeholder="https://your-service.up.railway.app"
                        className={INPUT}
                      />
                      <p className="mt-1 pl-1 text-[10px] text-white/35">
                        Leave empty for the sandbox scene. Enter your VPS proxy URL to stream the live SL world.
                      </p>
                    </div>
                  </details>

                  <label className="flex cursor-pointer items-center gap-2 pl-1 pt-1">
                    <input
                      type="checkbox"
                      checked={rememberName}
                      onChange={(e) => setRememberName(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-white/20 bg-white/10 accent-white"
                    />
                    <span className="text-[11px] text-white/45">Remember username</span>
                  </label>

                  {error && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                      <p className="text-xs text-red-300">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    style={{ backgroundColor: accent }}
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-[#1b1a1a] shadow-lg transition-all hover:brightness-110 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black/70" />
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

              <div className="mt-4 flex items-center justify-center gap-4 text-[11px]">
                {ownerSignedIn && (
                  <button onClick={() => setShowCustomize(true)} className="flex items-center gap-1.5 text-white/40 hover:text-white/80">
                    <Palette className="h-3 w-3" /> Customize this screen
                  </button>
                )}
                <button onClick={() => setInfoMode("help")} className="text-white/40 hover:text-white/80">
                  Help
                </button>
              </div>
            </div>
          </div>
        </main>

        <footer className="border-t border-white/5 px-4 py-4 text-center text-[10px] text-white/30">
          Powered by Second Life Go · Your credentials go straight to the grid login server
        </footer>
      </div>

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