import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, ChevronDown, LogIn, Eye, EyeOff } from "lucide-react";
import { base44 } from "@/api/base44Client";

const GRIDS = [
  { id: "agni", label: "Second Life (Main Grid)" },
  { id: "aditi", label: "Second Life (Beta Grid)" },
  { id: "osgrid", label: "OSGrid" },
  { id: "custom", label: "Custom Grid..." },
];

export default function SLLogin() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [grid, setGrid] = useState("agni");
  const [customLoginUri, setCustomLoginUri] = useState("");
  const [showGrid, setShowGrid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await base44.functions.invoke("sl_connect", {
        first_name: firstName,
        last_name: lastName || "Resident",
        password,
        grid,
        custom_login_uri: customLoginUri,
      });
      const data = response.data;
      if (data.success) {
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

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-black flex flex-col">
      {/* Background visual */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-cyan-950/20 to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-radial from-blue-500/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-cyan-500/20 ring-1 ring-white/10">
              <Globe className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Second Life</h1>
            <p className="text-gray-500 text-sm mt-1">Connect to your virtual world</p>
          </div>

          {/* Login Form */}
          <div className="bg-gray-900/60 backdrop-blur-2xl border border-gray-800/40 rounded-3xl p-6 shadow-2xl">
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block pl-1">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First"
                    required
                    className="w-full bg-gray-800/40 border border-gray-700/40 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:bg-gray-800/60 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block pl-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Resident"
                    required
                    className="w-full bg-gray-800/40 border border-gray-700/40 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:bg-gray-800/60 transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block pl-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-gray-800/40 border border-gray-700/40 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:bg-gray-800/60 transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Grid Selector */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block pl-1">Grid</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowGrid(!showGrid)}
                    className="w-full bg-gray-800/40 border border-gray-700/40 rounded-xl px-4 py-3 text-white text-left flex items-center justify-between text-sm hover:bg-gray-800/60 transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-cyan-400" />
                      {selectedGrid?.label}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showGrid ? "rotate-180" : ""}`} />
                  </button>

                  {showGrid && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700/50 rounded-xl overflow-hidden shadow-xl z-10">
                      {GRIDS.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => { setGrid(g.id); setShowGrid(false); }}
                          className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-700/50 transition-colors ${grid === g.id ? "text-cyan-400 bg-gray-700/30" : "text-gray-300"}`}
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
                  <label className="text-xs text-gray-400 mb-1 block pl-1">Login URI</label>
                  <input
                    type="text"
                    value={customLoginUri}
                    onChange={(e) => setCustomLoginUri(e.target.value)}
                    placeholder="http://grid.example.com:8002/cgi-bin/login.cgi"
                    required
                    className="w-full bg-gray-800/40 border border-gray-700/40 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:bg-gray-800/60 transition-all text-sm"
                  />
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-xs">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl py-3.5 font-semibold text-sm hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 mt-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Connect to Second Life
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-gray-600 text-xs mt-6">
            Your credentials are sent directly to Linden Lab servers
          </p>
        </div>
      </div>
    </div>
  );
}