import React, { useState } from "react";
import { base44 } from "@/api/base44Client";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const token = new URLSearchParams(window.location.search).get("token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      await base44.auth.resetPassword({ resetToken: token, newPassword: password });
      window.location.href = "/login";
    } catch (err) {
      setError(err.message || "Reset failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6">
        <form onSubmit={handleSubmit}>
          <h2 className="text-lg font-semibold text-white mb-4">New Password</h2>
          <input type="password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 mb-3 text-sm" />
          <input type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} required className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 mb-3 text-sm" />
          {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl py-3 font-medium text-sm disabled:opacity-50">{loading ? "Resetting..." : "Reset Password"}</button>
        </form>
      </div>
    </div>
  );
}