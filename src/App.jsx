// src/App.jsx
import { useState } from "react";
import LoginScreen from "./components/LoginScreen";
import Layout from "./components/Layout";
import Welcome from "./pages/Welcome";
import Schedule from "./pages/Schedule";
import Presenters from "./pages/Presenters";
import Profile from "./pages/Profile";
import "./index.css";

import { useAuth } from "./context/AuthContext";

export default function App() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("welcome");

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
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "welcome" && <Welcome />}
      {activeTab === "schedule" && <Schedule />}
      {activeTab === "presenters" && <Presenters />}
      {activeTab === "profile" && <Profile />}
    </Layout>
  );
}
