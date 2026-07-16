import React, { useState } from "react";
import { base44 } from "@/api/base44Client";

export default function Login() {
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authMode, setAuthMode] = useState("login");

  React.useEffect(() => {
    base44.auth.isAuthenticated().then((authed) => {
      if (authed) {
        window.location.href = "/sl-login";
      } else {
        setIsLoadingAuth(false);
      }
    });
  }, []);

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-700 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  return <AuthForm mode={authMode} setMode={setAuthMode} />;
}

function AuthForm({ mode, setMode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("form");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = "/sl-login";
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setStep("otp");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      base44.auth.setToken(result.access_token);
      window.location.href = "/sl-login";
    } catch (err) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      await base44.auth.resendOtp(email);
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
      setError("");
      setStep("reset-sent");
    } catch {
      // Always show success
    } finally {
      setLoading(false);
      setStep("reset-sent");
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="text-white text-2xl font-bold">SL</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Second Life Mobile</h1>
          <p className="text-gray-500 text-sm mt-1">Your world. Your imagination.</p>
        </div>

        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-2xl">
          {mode === "forgot" ? (
            step === "reset-sent" ? (
              <div className="text-center py-4">
                <p className="text-gray-300 mb-4">If an account exists for that email, a reset link has been sent.</p>
                <button onClick={() => { setMode("login"); setStep("form"); }} className="text-cyan-400 text-sm hover:text-cyan-300">Back to login</button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword}>
                <h2 className="text-lg font-semibold text-white mb-4">Reset Password</h2>
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 mb-3 text-sm" />
                {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl py-3 font-medium text-sm hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50">{loading ? "Sending..." : "Send Reset Link"}</button>
                <button type="button" onClick={() => { setMode("login"); setStep("form"); }} className="w-full mt-3 text-gray-400 text-sm hover:text-white">Back to login</button>
              </form>
            )
          ) : step === "otp" ? (
            <form onSubmit={handleVerifyOtp}>
              <h2 className="text-lg font-semibold text-white mb-2">Verify Email</h2>
              <p className="text-gray-400 text-xs mb-4">Enter the code sent to {email}</p>
              <input type="text" placeholder="Verification code" value={otpCode} onChange={e => setOtpCode(e.target.value)} required className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 mb-3 text-sm tracking-widest text-center" />
              {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
              <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl py-3 font-medium text-sm disabled:opacity-50">{loading ? "Verifying..." : "Verify"}</button>
              <button type="button" onClick={handleResendOtp} className="w-full mt-3 text-gray-400 text-sm hover:text-white">Resend code</button>
            </form>
          ) : (
            <form onSubmit={mode === "login" ? handleLogin : handleRegister}>
              <div className="flex gap-1 bg-gray-800/50 rounded-xl p-1 mb-5">
                <button type="button" onClick={() => setMode("login")} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === "login" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"}`}>Sign In</button>
                <button type="button" onClick={() => setMode("register")} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === "register" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"}`}>Sign Up</button>
              </div>

              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 mb-3 text-sm" />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 mb-3 text-sm" />
              {mode === "register" && (
                <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 mb-3 text-sm" />
              )}
              {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
              <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl py-3 font-medium text-sm hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50">{loading ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}</button>
              {mode === "login" && (
                <button type="button" onClick={() => setMode("forgot")} className="w-full mt-3 text-gray-400 text-sm hover:text-white">Forgot password?</button>
              )}

              <div className="mt-4 pt-4 border-t border-gray-800/50">
                <button type="button" onClick={() => base44.auth.loginWithProvider("google", "/sl-login")} className="w-full flex items-center justify-center gap-2 bg-gray-800/50 border border-gray-700/50 text-gray-300 rounded-xl py-3 text-sm hover:bg-gray-700/50 transition-all">
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Continue with Google
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}