// src/components/LoginScreen.jsx
import { useState } from "react";
import "./LoginScreen.css";

import loginVideo from "../assets/wigc20242025timel.mp4";
import cnigaLogo from "../assets/cniga-logo.svg";
import { supabase } from "../lib/supabaseClient";
import { ensureAttendeeProfile } from "../lib/profileHydration";

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Auth UX modes
  const [authMode, setAuthMode] = useState("magic"); // "magic" | "password"
  const [mode, setMode] = useState("signin"); // only used for password mode: "signin" | "signup"

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleMagicLink(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    setLoading(true);

    try {
      // Sends a sign-in link / OTP email. User clicks link and returns authenticated.
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Must match a URL allowed in Supabase Auth settings.
          // If you have a custom domain, use it instead of netlify.app.
          emailRedirectTo: window.location.origin,
        },
      });

      if (otpError) throw otpError;

      setMessage(
        "Check your email for a sign-in link. Tap it to finish logging in."
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not send sign-in link. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePassword(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signin") {
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (signInError) throw signInError;

        const session = data?.session || null;
        const user = session?.user || null;

        if (user) await ensureAttendeeProfile(user);

        setMessage("Signed in successfully.");
        if (typeof onLogin === "function") onLogin(session);
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        const session = data?.session || null;
        const user = session?.user || null;

        if (session && user) {
          await ensureAttendeeProfile(user);
          setMessage("Account created and signed in.");
          if (typeof onLogin === "function") onLogin(session);
        } else {
          setMessage(
            "Account created. Please check your email to confirm your address."
          );
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-root">
      <div className="login-video-layer">
        <video
          className="login-video"
          src={loginVideo}
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="login-video-overlay" />
      </div>

      <div className="login-content">
        <div className="login-stack">
          <div className="login-logo-wrap">
            <img src={cnigaLogo} alt="CNIGA logo" className="login-brand-mark" />
          </div>

          <div className="login-brand-text">
            <span className="login-brand-line-1">
              Western Indian Gaming Conference
            </span>
            <span className="login-brand-line-2">
              Pechanga Resort Casino • 2026
            </span>
          </div>

          {/* ---------- MODE SWITCH (Magic vs Password) ---------- */}
          <div className="login-auth-switch">
            <button
              type="button"
              className={
                authMode === "magic"
                  ? "login-auth-pill login-auth-pill-active"
                  : "login-auth-pill"
              }
              onClick={() => setAuthMode("magic")}
              disabled={loading}
            >
              Email link
            </button>

            <button
              type="button"
              className={
                authMode === "password"
                  ? "login-auth-pill login-auth-pill-active"
                  : "login-auth-pill"
              }
              onClick={() => setAuthMode("password")}
              disabled={loading}
            >
              Password
            </button>
          </div>

          {/* ---------- MAGIC LINK FORM ---------- */}
          {authMode === "magic" && (
            <form className="login-form" onSubmit={handleMagicLink}>
              <label className="login-label">
                Email
                <input
                  type="email"
                  className="login-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>

              {error && <p className="login-error">{error}</p>}
              {message && !error && <p className="login-message">{message}</p>}

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? "Sending..." : "Email me a sign-in link"}
              </button>

              <p className="login-hint">
                Returning attendee? Use your email — no password needed.
              </p>
            </form>
          )}

          {/* ---------- PASSWORD FORM ---------- */}
          {authMode === "password" && (
            <form className="login-form" onSubmit={handlePassword}>
              <label className="login-label">
                Email
                <input
                  type="email"
                  className="login-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="login-label">
                Password
                <div className="login-password-row">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="login-input login-input-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      mode === "signin"
                        ? "Enter your password"
                        : "Create a password"
                    }
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                    required
                  />
                  <button
                    type="button"
                    className="login-toggle-password"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={loading}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              {error && <p className="login-error">{error}</p>}
              {message && !error && <p className="login-message">{message}</p>}

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : mode === "signin"
                  ? "Log in"
                  : "Create account"}
              </button>

              <button
                type="button"
                className="login-mode-toggle"
                onClick={() =>
                  setMode((m) => (m === "signin" ? "signup" : "signin"))
                }
                disabled={loading}
              >
                {mode === "signin"
                  ? "New here? Create an account"
                  : "Already have an account? Log in"}
              </button>

              <p className="login-hint">
                Prefer a password? You can use this method instead of email links.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
