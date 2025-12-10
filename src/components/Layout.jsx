// src/components/LoginScreen.jsx
import { useEffect, useRef, useState } from "react";
import "./LoginScreen.css";

import loginVideo from "../assets/wigc20242025timel.mp4";
import cnigaLogo from "../assets/cniga-logo.svg";

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef(null);

  // Force smooth autoplay + looping
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const safePlay = () => {
      const p = video.play?.();
      if (p && p.catch) p.catch(() => {});
    };

    safePlay();

    const handleEnded = () => {
      video.currentTime = 0;
      safePlay();
    };

    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();

    // DEMO ONLY: any non-empty email + password logs in.
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    localStorage.setItem("cniga_isLoggedIn", "true");
    onLogin();
  }

  return (
    <div className="login-root">
      {/* Background video */}
      <div className="login-video-layer">
        <video
          ref={videoRef}
          className="login-video"
          src={loginVideo}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
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

          {/* WIGC heading block under logo, above form */}
          <div className="login-brand-text">
            <span className="login-brand-line-1">
              Western Indian Gaming Conference
            </span>
            <span className="login-brand-line-2">
              Pechanga Resort Casino • 2026
            </span>
          </div>

          {/* PURE form – no module background */}
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
                  placeholder="Enter your password"
                  autoComplete="current-password"
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

            <button type="submit" className="login-button">
              Log in
            </button>

            <p className="login-hint">
              Demo mode: any email &amp; password will sign you in.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
