// src/components/LoginScreen.jsx
import { useState } from "react";
import "./LoginScreen.css";

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();

    // For now, accept ANY non-empty email/password.
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    localStorage.setItem("cniga_isLoggedIn", "true");
    // later we can also store token / user info here
    onLogin();
  }

  return (
    <div className="login-root">
      <div className="login-card">
        <h1 className="login-title">Western Indian Gaming Conference</h1>
        <p className="login-subtitle">
          CNIGA • Pechanga Resort Casino • 2026
        </p>

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
            Any email & password will work for this demo.
          </p>
        </form>
      </div>
    </div>
  );
}
