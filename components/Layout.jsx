// src/components/Layout.jsx
import "./Layout.css";
import wigcLogoWhite from "../assets/wigc-logo-white.svg";
import bgImage from "../assets/bg1.jpg"; 
import profileIcon from "../assets/profile-icon.svg";

const TAB_LABELS = {
  welcome: "Welcome",
  schedule: "Schedule",
  presenters: "Presenters",
  profile: "My Profile",
};

export default function Layout({ activeTab, onTabChange, children }) {
  return (
    <div className="app-shell">
      {/* Top bar */}
      <header className="app-header">
        <button
          className="app-header-logo"
          onClick={() => onTabChange("welcome")}
          aria-label="Go to welcome screen"
        >
          <img src={wigcLogoWhite} alt="WIGC logo" />
        </button>

        <div className="app-header-title">
          {TAB_LABELS[activeTab] || "Western Indian Gaming Conference"}
        </div>

        <button
          className="app-header-profile"
          onClick={() => onTabChange("profile")}
          aria-label="View profile"
        >
          <span className="app-header-profile-icon"><img src={profileIcon} alt="Profile Icon" /></span>
        </button>
      </header>

      {/* Scrollable main content */}
      <main className="app-main">
        <div className="app-main-inner">{children}</div>
      </main>

      {/* Bottom nav */}
      <nav className="app-bottom-nav" aria-label="Primary navigation">
        <button
          className={
            "app-nav-btn" +
            (activeTab === "welcome" ? " app-nav-btn-active" : "")
          }
          onClick={() => onTabChange("welcome")}
        >
          <span className="app-nav-label">Welcome</span>
        </button>

        <button
          className={
            "app-nav-btn" +
            (activeTab === "schedule" ? " app-nav-btn-active" : "")
          }
          onClick={() => onTabChange("schedule")}
        >
          <span className="app-nav-label">Schedule</span>
        </button>

        <button
          className={
            "app-nav-btn" +
            (activeTab === "presenters" ? " app-nav-btn-active" : "")
          }
          onClick={() => onTabChange("presenters")}
        >
          <span className="app-nav-label">Presenters</span>
        </button>
      </nav>
    </div>
  );
}