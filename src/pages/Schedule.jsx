// src/pages/Schedule.jsx
import { useEffect, useState } from "react";
import { fetchScheduleData } from "../api/wp";
import "./Schedule.css";

const STAR_STORAGE_KEY = "wigc_starred_events";

export default function Schedule() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [socials, setSocials] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [error, setError] = useState("");
  const [view, setView] = useState("all"); // all | sessions | socials
  const [searchTerm, setSearchTerm] = useState("");
  const [trackFilter, setTrackFilter] = useState("all");
  const [starredIds, setStarredIds] = useState(() => {
    try {
      const raw = localStorage.getItem(STAR_STORAGE_KEY);
      if (!raw) return new Set();
      return new Set(JSON.parse(raw));
    } catch {
      return new Set();
    }
  });

  // Load schedule once
  useEffect(() => {
    (async () => {
      try {
        const { sessions, socials, allEvents } = await fetchScheduleData();
        setSessions(sessions);
        setSocials(socials);
        setAllEvents(allEvents);
      } catch (err) {
        console.error(err);
        setError("Unable to load schedule.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Persist stars
  useEffect(() => {
    try {
      localStorage.setItem(
        STAR_STORAGE_KEY,
        JSON.stringify(Array.from(starredIds))
      );
    } catch {
      // ignore
    }
  }, [starredIds]);

  const toggleStar = (id) => {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (loading) {
    return <p className="app-status-text">Loading schedule…</p>;
  }

  if (error) {
    return <p className="app-status-text app-status-error">{error}</p>;
  }

  // Determine base events by view
  let baseEvents;
  if (view === "sessions") {
    baseEvents = sessions;
  } else if (view === "socials") {
    baseEvents = socials;
  } else {
    baseEvents = allEvents;
  }

  // Track list is built from sessions only
  const trackSet = new Set(
    sessions.map((e) => e.track).filter((t) => t && t.trim())
  );
  const trackOptions = ["all", ...Array.from(trackSet).sort()];

  // Apply track filter (for seminars view only)
  let filtered = baseEvents;
  if (view === "sessions" && trackFilter !== "all") {
    filtered = filtered.filter((e) => e.track === trackFilter);
  }

  // Apply search filter across title, track, room, and description
  const term = searchTerm.trim().toLowerCase();
  if (term) {
    filtered = filtered.filter((e) => {
      const haystack = [
        e.title || "",
        e.track || "",
        e.room || "",
        e.contentHtml || "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }

  if (!filtered.length) {
    return (
      <div className="schedule-root">
        <ScheduleFilters
          view={view}
          setView={setView}
          trackOptions={trackOptions}
          trackFilter={trackFilter}
          setTrackFilter={setTrackFilter}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
        <p className="app-status-text">No events found for this view.</p>
      </div>
    );
  }

  // Sort by sortKey, fallback by title
  const sorted = [...filtered].sort((a, b) => {
    if (a.sortKey && b.sortKey) return a.sortKey.localeCompare(b.sortKey);
    if (a.sortKey) return -1;
    if (b.sortKey) return 1;
    return (a.title || "").localeCompare(b.title || "");
  });

  // Group by day (heading), using dayKey/date
  const dayMap = new Map();
  for (const ev of sorted) {
    const key = ev.dayKey || ev.date || "Other";
    const label = ev.date || "Other";
    if (!dayMap.has(key)) {
      dayMap.set(key, { key, label, events: [] });
    }
    dayMap.get(key).events.push(ev);
  }

  const dayGroups = Array.from(dayMap.values()).sort((a, b) => {
    const aKey = a.events[0]?.sortKey || "";
    const bKey = b.events[0]?.sortKey || "";
    return aKey.localeCompare(bKey);
  });

  return (
    <div className="schedule-root">
      <ScheduleFilters
        view={view}
        setView={setView}
        trackOptions={trackOptions}
        trackFilter={trackFilter}
        setTrackFilter={setTrackFilter}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {dayGroups.map((day) => (
        <section key={day.key} className="schedule-section">
          <h2>{day.label}</h2>
          <div className="schedule-list">
            {day.events.map((e) => (
              <article key={e.id} className="schedule-card">
                <div className="schedule-card-header">
                  <button
                    type="button"
                    className={
                      "schedule-star-btn" +
                      (starredIds.has(e.id) ? " schedule-star-btn-on" : "")
                    }
                    onClick={() => toggleStar(e.id)}
                    aria-pressed={starredIds.has(e.id)}
                    aria-label={
                      starredIds.has(e.id)
                        ? "Remove from My Schedule"
                        : "Add to My Schedule"
                    }
                  >
                    {starredIds.has(e.id) ? "★" : "☆"}
                  </button>

                  <div className="schedule-meta">
                    {(e.startTime || e.endTime || e.room) && (
                      <p>
                        {e.startTime && (
                          <span>
                            {e.startTime}
                            {e.endTime ? `–${e.endTime}` : ""}
                          </span>
                        )}
                        {e.room && (
                          <>
                            {" • "}
                            <span>{e.room}</span>
                          </>
                        )}
                      </p>
                    )}

                    {(e.track ||
                      (e.speakers && e.speakers.length) ||
                      e.moderator) && (
                      <p>
                        {e.track && <span>Track: {e.track}</span>}
                        {e.track &&
                          (e.speakers?.length || e.moderator) &&
                          " • "}
                        {e.speakers && e.speakers.length > 0 && (
                          <span>
                            Speakers:{" "}
                            {e.speakers
                              .map((sp) => {
                                if (!sp) return "";
                                if (sp.name) return sp.name;
                                const parts = [
                                  sp.firstName,
                                  sp.lastName,
                                ].filter(Boolean);
                                return parts.join(" ");
                              })
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        )}
                        {e.moderator && (
                          <>
                            {" • "}
                            <span>Moderator: {e.moderator.name}</span>
                          </>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <h3
                  className="schedule-title"
                  dangerouslySetInnerHTML={{ __html: e.title }}
                />
                {e.contentHtml && (
                  <div
                    className="schedule-body"
                    dangerouslySetInnerHTML={{ __html: e.contentHtml }}
                  />
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ScheduleFilters({
  view,
  setView,
  trackOptions,
  trackFilter,
  setTrackFilter,
  searchTerm,
  setSearchTerm,
}) {
  return (
    <div className="schedule-filters-root">
      <div className="schedule-filters">
        <button
          className={
            "schedule-filter-btn" +
            (view === "all" ? " schedule-filter-btn-active" : "")
          }
          onClick={() => setView("all")}
        >
          Full schedule
        </button>
        <button
          className={
            "schedule-filter-btn" +
            (view === "sessions" ? " schedule-filter-btn-active" : "")
          }
          onClick={() => setView("sessions")}
        >
          Seminars
        </button>
        <button
          className={
            "schedule-filter-btn" +
            (view === "socials" ? " schedule-filter-btn-active" : "")
          }
          onClick={() => setView("socials")}
        >
          Social
        </button>
      </div>

      <div className="schedule-search-row">
        <input
          type="search"
          className="schedule-search-input"
          placeholder="Search events, tracks, rooms…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* Track filter only really matters for seminars */}
        {view === "sessions" && trackOptions.length > 1 && (
  <select
    className="schedule-track-select"
    value={trackFilter}
    onChange={(e) => setTrackFilter(e.target.value)}
  >
    {trackOptions.map((t) => (
      <option key={t} value={t}>
        {t === "all" ? "All tracks" : t}
      </option>
    ))}
  </select>
)}
      </div>
    </div>
  );
}
