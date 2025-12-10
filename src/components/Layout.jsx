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

      <div
        className="app-bg-image"
        style={{ backgroundImage: `url(${bgImage})` }}
      />

      <header className="app-header">
        <div className="app-header-left">
          <button
            type="button"
            className="app-header-logo"
            onClick={() => onTabChange("welcome")}
            aria-label="Go to welcome screen"
          >
            <img src={wigcLogoWhite} alt="WIGC logo" />
            <span className="app-header-wordmark">WIGC</span>
          </button>
        </div>

        <div className="app-header-title">
          {TAB_LABELS[activeTab] || ""}
        </div>

        <button
          type="button"
          className="app-header-profile-btn"
          onClick={() => onTabChange("profile")}
          aria-label="View profile"
        >
          <span className="app-header-profile-icon">
            <img src={profileIcon} alt="Profile" />
          </span>
        </button>
      </header>

      <main className="app-main">
        <div className="app-main-inner">{children}</div>
      </main>

      <nav className="bottom-nav" aria-label="Primary navigation">
        <div className="bottom-nav-inner">
          {["welcome", "schedule", "presenters"].map((tab) => (
            <button
              key={tab}
              type="button"
              className={
                "bottom-nav-btn" +
                (activeTab === tab ? " bottom-nav-btn-active" : "")
              }
              onClick={() => onTabChange(tab)}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
