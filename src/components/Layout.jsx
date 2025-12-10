// src/components/Layout.jsx
import "./Layout.css";
import wigcLogoWhite from "../assets/wigc-logo-white.svg";
import bgImage from "../assets/bg1.jpg"; // just to ensure bundlers don't tree-shake it

export default function Layout({ activeTab, onTabChange, children }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-left">
          <img
            src={wigcLogoWhite}
            alt="Western Indian Gaming Conference"
            className="app-header-logo"
          />
          <div className="app-header-text">
            <span className="app-header-title">
              Western Indian Gaming Conference
            </span>
            <span className="app-header-subtitle">
              CNIGA • Pechanga Resort Casino • 2026
            </span>
          </div>
        </div>

        <nav className="app-tabs">
          <button
            className={
              "app-tab" + (activeTab === "welcome" ? " app-tab-active" : "")
            }
            onClick={() => onTabChange("welcome")}
          >
            Welcome
          </button>
          <button
            className={
              "app-tab" + (activeTab === "schedule" ? " app-tab-active" : "")
            }
            onClick={() => onTabChange("schedule")}
          >
            Schedule
          </button>
          <button
            className={
              "app-tab" + (activeTab === "presenters" ? " app-tab-active" : "")
            }
            onClick={() => onTabChange("presenters")}
          >
            Presenters
          </button>
        </nav>
      </header>

      <main className="app-main">{children}</main>
    </div>
  );
}
