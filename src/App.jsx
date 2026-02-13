// src/App.jsx
import { useCallback, useEffect, useMemo, useState } from "react";

import Welcome from "./pages/Welcome";
import Schedule from "./pages/Schedule";
import Presenters from "./pages/Presenters";

import "./App.css";

/**
 * Tiny, dependency-free router.
 * Why: deep links like /presenters?presenterId=123 should load the Presenters screen
 * on first page load/refresh (Netlify + future mobile deep linking).
 *
 * Pages:
 *   /               -> welcome
 *   /schedule       -> schedule
 *   /presenters     -> presenters (supports ?presenterId=####)
 */
function parseRouteFromLocation() {
  if (typeof window === "undefined") return { page: "welcome" };

  const rawPath = window.location.pathname || "/";
  const path = rawPath.replace(/\/+$/, "") || "/";

  // Support legacy query param routing, if you ever used it before (optional)
  const params = new URLSearchParams(window.location.search);
  const legacyPage = params.get("page");

  let page = "welcome";
  if (path === "/schedule" || legacyPage === "schedule") page = "schedule";
  if (path === "/presenters" || legacyPage === "presenters") page = "presenters";

  return {
    page,
    presenterId: params.get("presenterId") || null,
  };
}

function buildUrl({ page, presenterId }) {
  let path = "/";
  if (page === "schedule") path = "/schedule";
  if (page === "presenters") path = "/presenters";

  const params = new URLSearchParams();
  if (page === "presenters" && presenterId) params.set("presenterId", String(presenterId));

  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export default function App() {
  const [route, setRoute] = useState(() => parseRouteFromLocation());

  // Keep app state in sync with the browser URL (back/forward + manual edits)
  useEffect(() => {
    const onPopState = () => setRoute(parseRouteFromLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((next) => {
    const nextRoute = { ...route, ...next };
    const url = buildUrl(nextRoute);

    // Update URL without full reload
    window.history.pushState({}, "", url);
    setRoute(nextRoute);
  }, [route]);

  // If you land on /presenters?presenterId=###, Presenters.jsx already auto-selects.
  // This ensures if presenterId changes via URL (e.g. copied link), we re-render.
  const pageEl = useMemo(() => {
    if (route.page === "schedule") return <Schedule />;
    if (route.page === "presenters") return <Presenters key={`presenters:${route.presenterId || "none"}`} />;
    return <Welcome />;
  }, [route.page, route.presenterId]);

  return (
    <div className="app-root">
      <header className="top-bar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">WIGC</span>
        </div>
        <div className="top-title">{route.page === "schedule" ? "SCHEDULE" : route.page === "presenters" ? "PRESENTERS" : "WELCOME"}</div>
        <div className="top-actions" />
      </header>

      <main className="app-main">{pageEl}</main>

      {/* Bottom nav: uses navigate() so URL always matches and deep links work */}
      <nav className="bottom-nav" aria-label="Primary">
        <button
          type="button"
          className={`nav-btn ${route.page === "welcome" ? "active" : ""}`}
          onClick={() => navigate({ page: "welcome", presenterId: null })}
        >
          WELCOME
        </button>
        <button
          type="button"
          className={`nav-btn ${route.page === "schedule" ? "active" : ""}`}
          onClick={() => navigate({ page: "schedule", presenterId: null })}
        >
          SCHEDULE
        </button>
        <button
          type="button"
          className={`nav-btn ${route.page === "presenters" ? "active" : ""}`}
          onClick={() => navigate({ page: "presenters" })}
        >
          PRESENTERS
        </button>
      </nav>
    </div>
  );
}
