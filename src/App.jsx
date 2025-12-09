// src/App.jsx
import { useEffect, useState } from "react";
import LoginScreen from "./components/LoginScreen";
import Layout from "./components/Layout";
import Welcome from "./pages/Welcome";
import Schedule from "./pages/Schedule";
import Presenters from "./pages/Presenters";
import "./index.css";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState("welcome");

  useEffect(() => {
    if (localStorage.getItem("cniga_isLoggedIn") === "true") {
      setIsLoggedIn(true);
    }
  }, []);

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "welcome" && <Welcome />}
      {activeTab === "schedule" && <Schedule />}
      {activeTab === "presenters" && <Presenters />}
    </Layout>
  );
}
