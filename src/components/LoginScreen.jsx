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

  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
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
        // Existing user sign-in
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (signInError) {
          throw signInError;
        }

        // Optional: show a small message
        setMessage("Signed in successfully.");

        // Notify parent that login succeeded
        if (typeof onLogin === "function") {
          onLogin(data?.session || null);
        }
      } else {
        // New user sign-up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          throw signUpError;
        }

        // Depending on your Supabase email confirmation settings:
        // - If email confirmation is OFF, data.session will be set and user is logged in.
        // - If email confirmation is ON, they must confirm via email first.
        if (data?.session) {
          setMessage("Account created and signed in.");
          if (typeof onLogin === "function") {
            onLogin(data.session);
          }
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
      {/* Background video */}
      <div className="login-video-layer">
        <video
          className="login-video"
          src={loginVideo}
          autoPlay
          muted
          loop
          playsInline
        />
        {/* Slate overlay so form pops while video still visible */}
        <div className="login-video-overlay" />
      </div>

      {/* Foreground content */}
      <div className="login-content">
        <div className="login-stack">
          {/* LOGO on top */}
          <div className="login-logo-wrap">
            <img
              src={cnigaLogo}
              alt="CNIGA logo"
              className="login-brand-mark"
            />
          </div>

          {/* Heading under logo */}
          <div className="login-brand-text">
            <span className="login-brand-line-1">
              Western Indian Gaming Conference
            </span>
            <span className="login-brand-line-2">
              Pechanga Resort Casino • 2026
            </span>
          </div>

          {/* Form directly under heading */}
          <form className="login-form" onSubmit={handleSubmit}>
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
                    mode === "signin"
                      ? "current-password"
                      : "new-password"
                  }
                  required
                />
                <button
                  type="button"
                  className="login-toggle-password"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            {error && <p className="login-error">{error}</p>}
            {message && !error && (
              <p className="login-message">{message}</p>
            )}

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
            >
              {mode === "signin"
                ? "New here? Create an account"
                : "Already have an account? Log in"}
            </button>

            {/* Old demo hint removed / replaced */}
            <p className="login-hint">
              Use the email you registered with for WIGC to access your
              profile and schedule.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
        }
