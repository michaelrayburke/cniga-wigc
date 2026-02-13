// src/App.jsx
import { useCallback, useEffect, useState } from "react";
import LoginScreen from "./components/LoginScreen";
import Layout from "./components/Layout";
import Welcome from "./pages/Welcome";
import Schedule from "./pages/Schedule";
import Presenters from "./pages/Presenters";
import Profile from "./pages/Profile";
import "./index.css";

import { useAuth } from "./context/AuthContext";

// Map URL paths to tabs
function tabFromPath(pathname) {
  const path = (pathname || "/").replace(/\/+$/, "") || "/";

  if (path === "/presenters") return "presenters";
  if (path === "/schedule") return "schedule";
  if (path === "/profile") return "profile";
  // default (/, /welcome, anything unknown)
  return "welcome";
}

// Map tabs back to URL paths
function pathFromTab(tab) {
  if (tab === "presenters") return "/presenters";
  if (tab === "schedule") return "/schedule";
  if (tab === "profile") return "/profile";
  return "/";
}

export default function App() {
  const { user, loading } = useAuth();

  // ✅ Initialize the tab from the current URL so deep links work on refresh.
  const [activeTab, setActiveTab] = useState(() => tabFromPath(window.location.pathname));

  // ✅ Keep the tab in sync with browser back/forward.
  useEffect(() => {
    const onPop = () => setActiveTab(tabFromPath(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // ✅ Use a single tab-change handler that also updates the URL (SPA-style).
  const handleTabChange = useCallback((nextTab) => {
    setActiveTab(nextTab);

    const nextPath = pathFromTab(nextTab);

    // Preserve query params ONLY when staying on presenters (so presenterId survives)
    const keepSearch = nextTab === "presenters" ? window.location.search : "";
    const nextUrl = `${nextPath}${keepSearch}`;

    if (window.location.pathname + window.location.search !== nextUrl) {
      window.history.pushState({}, "", nextUrl);
    }
  }, []);

  // While Supabase is checking for an existing session
  if (loading) {
    return (
      <div className="app-loading">
        <p>Loading WIGC app…</p>
      </div>
    );
  }

  // Not logged in → show login screen
  if (!user) {
    return <LoginScreen />; // no more localStorage / onLogin needed
  }

  // Logged in → show main app shell with tabs
  return (
    <Layout activeTab={activeTab} onTabChange={handleTabChange}>
      {activeTab === "welcome" && <Welcome />}
      {activeTab === "schedule" && <Schedule />}
      {activeTab === "presenters" && <Presenters />}
      {activeTab === "profile" && <Profile />}
    </Layout>
  );
}
