// src/components/Layout.jsx
import "./Layout.css";

export default function Layout({ activeTab, onTabChange, children }) {
  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-header-left">
          <img src="/images/logo.png" alt="CNIGA" className="app-header-logo" />
          <div>
            <h1 className="app-header-title">Western Indian Gaming Conference</h1>
            <p className="app-header-subtitle">
              CNIGA • Pechanga Resort Casino • 2026
            </p>
          </div>
        </div>
      </header>

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

      <main className="app-main">{children}</main>
    </div>
  );
}
