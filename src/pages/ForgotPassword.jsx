import React, { useState } from "react";
import { base44 } from "@/api/base44Client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await base44.auth.resetPasswordRequest(email); } catch {}
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6">
        {sent ? (
          <div className="text-center">
            <p className="text-gray-300 mb-4">If an account exists, a reset link has been sent.</p>
            <a href="/login" className="text-cyan-400 text-sm">Back to login</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 className="text-lg font-semibold text-white mb-4">Reset Password</h2>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 mb-3 text-sm" />
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl py-3 font-medium text-sm disabled:opacity-50">{loading ? "Sending..." : "Send Reset Link"}</button>
            <a href="/login" className="block mt-3 text-center text-gray-400 text-sm hover:text-white">Back to login</a>
          </form>
        )}
      </div>
    </div>
  );
}