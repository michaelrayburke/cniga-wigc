// src/components/LoginScreen.jsx
import { useState } from "react";
import "./LoginScreen.css";

export default function LoginScreen({ onLogin }) {
  const [code, setCode] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!code.trim()) return;
    localStorage.setItem("cniga_isLoggedIn", "true");
    onLogin();
  }

  return (
    <div className="login-bg">
      <div className="login-overlay">
        <div className="login-card">
          <div className="login-logo-row">
            <img src="/images/logo.png" alt="CNIGA Logo" className="login-logo" />
            <div>
              <h1 className="login-title">Western Indian Gaming Conference</h1>
              <p className="login-subtitle">Attendee App Preview</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <label className="login-label">
              Registration Code
              <input
                type="text"
                className="login-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter code to continue"
              />
            </label>

            <button type="submit" className="login-button">
              Enter App
            </button>
          </form>

          <p className="login-footnote">
            This is a preview only. Final app will include personalized schedules
            and more.
          </p>
        </div>
      </div>
    </div>
  );
}
