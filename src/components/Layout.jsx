// src/components/Layout.jsx
import { useEffect, useRef, useState } from "react";
import "./Layout.css";
import wigcLogoWhite from "../assets/wigc-logo-white.svg";
import bgImage from "../assets/bg1.jpg";
import profileIcon from "../assets/profile-icon.svg";
import { useAuth } from "../context/AuthContext";

const TAB_LABELS = {
  welcome: "Welcome",
  schedule: "Schedule",
  presenters: "Presenters",
  profile: "My Profile",
};

export default function Layout({ activeTab, onTabChange, children }) {
  const { signOut } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(e) {
      if (!menuWrapRef.current) return;
      if (!menuWrapRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown, { passive: true });
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  async function handleLogout() {
    try {
      setMenuOpen(false);
      await signOut();
      // AuthContext will flip the UI back to Login automatically
    } catch (err) {
      console.error("Logout failed", err);
    }
  }

  function goToProfile() {
    setMenuOpen(false);
    onTabChange("profile");
  }

  return (
    <div className="app-shell">
      {/* Background image layer */}
      <div
        className="app-bg-image"
        style={{ backgroundImage: `url(${bgImage})` }}
      />

      {/* Top app bar */}
      <header className="app-header">
        <div className="app-header-left">
          <button
            type="button"
            className="app-header-logo"
            onClick={() => {
              setMenuOpen(false);
              onTabChange("welcome");
            }}
            aria-label="Go to welcome screen"
          >
            <img src={wigcLogoWhite} alt="WIGC logo" />
          </button>
        </div>

        <div className="app-header-title">{TAB_LABELS[activeTab] || ""}</div>

        {/* Profile dropdown */}
        <div className="app-header-profile-wrap" ref={menuWrapRef}>
          <button
            type="button"
            className="app-header-profile"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen ? "true" : "false"}
          >
            <span className="app-header-profile-icon">
              <img src={profileIcon} alt="" />
            </span>
          </button>

          {menuOpen && (
            <div className="profile-menu" role="menu" aria-label="Account menu">
              <button
                type="button"
                className="profile-menu-item"
                role="menuitem"
                onClick={goToProfile}
              >
                My Profile
              </button>

              <div className="profile-menu-divider" />

              <button
                type="button"
                className="profile-menu-item profile-menu-item-danger"
                role="menuitem"
                onClick={handleLogout}
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="app-main">
        <div className="app-main-inner">{children}</div>
      </main>

      {/* Bottom navigation */}
      <nav className="bottom-nav" aria-label="Primary navigation">
        <div className="bottom-nav-inner">
          {["welcome", "schedule", "presenters"].map((tab) => (
            <button
              key={tab}
              type="button"
              className={
                "app-nav-btn" + (activeTab === tab ? " app-nav-btn-active" : "")
              }
              onClick={() => {
                setMenuOpen(false);
                onTabChange(tab);
              }}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
