// src/pages/Schedule.jsx
import { useEffect, useState } from "react";
import { fetchScheduleData } from "../api/wp";
import "./Schedule.css";

export default function Schedule() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [socials, setSocials] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [error, setError] = useState("");
  const [view, setView] = useState("all"); // all | sessions | socials
  const [trackFilter, setTrackFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [starredIds, setStarredIds] = useState(() => {
    try {
      const raw = localStorage.getItem("cniga_starred_events");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

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

  // persist stars locally (placeholder RSVP)
  useEffect(() => {
    try {
      localStorage.setItem("cniga_starred_events", JSON.stringify(starredIds));
    } catch {
      // ignore
    }
  }, [starredIds]);

  function toggleStar(id) {
    setStarredIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  if (loading) {
    return <p className="app-status-text">Loading schedule…</p>;
  }

  if (error) {
    return <p className="app-status-text app-status-error">{error}</p>;
  }

  let baseEvents;
  if (view === "sessions") {
    baseEvents = sessions;
  } else if (view === "socials") {
    baseEvents = socials;
  } else {
    baseEvents = allEvents;
  }

  // Collect tracks for dropdown (only from sessions)
  const allTracks = Array.from(
    new Set(
      sessions
        .map((e) => e.track)
        .filter((t) => t && typeof t === "string")
        .map((t) => t.trim())
    )
  ).sort((a, b) => a.localeCompare(b));

  // Apply search + track filter
  const filtered = baseEvents.filter((e) => {
    if (view === "sessions" && trackFilter !== "all") {
      if (!e.track || e.track.trim() !== trackFilter) return false;
    }

    if (!search.trim()) return true;

    const q = search.toLowerCase();
    const haystack = [
      e.title,
      e.track,
      e.room,
      e.date,
      e.contentHtml,
      ...(e.speakers || []).map((sp) => sp.name),
      e.moderator?.name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });

  if (!filtered.length) {
    return (
      <div className="schedule-root">
        <ScheduleFilters
          view={view}
          setView={setView}
          search={search}
          setSearch={setSearch}
          trackFilter={trackFilter}
          setTrackFilter={setTrackFilter}
          tracks={allTracks}
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

  // Group by day
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
        search={search}
        setSearch={setSearch}
        trackFilter={trackFilter}
        setTrackFilter={setTrackFilter}
        tracks={allTracks}
      />

      {dayGroups.map((day) => (
        <section key={day.key} className="schedule-section">
          <h2 className="schedule-day-heading">{day.label}</h2>
          <div className="schedule-list">
            {day.events.map((e) => {
              const starred = starredIds.includes(e.id);
              return (
                <article key={e.id} className="schedule-card">
                  <header className="schedule-card-header">
                    <h3
                      className="schedule-title"
                      dangerouslySetInnerHTML={{ __html: e.title }}
                    />
                    <button
                      type="button"
                      className={
                        "schedule-star-btn" +
                        (starred ? " schedule-star-btn-active" : "")
                      }
                      onClick={() => toggleStar(e.id)}
                      aria-pressed={starred}
                      aria-label={
                        starred
                          ? "Remove from my schedule"
                          : "Add to my schedule"
                      }
                    >
                      ★
                    </button>
                  </header>

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

                  {e.contentHtml && (
                    <div
                      className="schedule-body"
                      dangerouslySetInnerHTML={{ __html: e.contentHtml }}
                    />
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function ScheduleFilters({
  view,
  setView,
  search,
  setSearch,
  trackFilter,
  setTrackFilter,
  tracks,
}) {
  return (
    <div className="schedule-filters">
      <div className="schedule-view-tabs">
        <button
          className={
            "schedule-view-tab" + (view === "all" ? " schedule-view-tab-active" : "")
          }
          onClick={() => setView("all")}
        >
          Full schedule
        </button>
        <button
          className={
            "schedule-view-tab" +
            (view === "sessions" ? " schedule-view-tab-active" : "")
          }
          onClick={() => setView("sessions")}
        >
          Seminars
        </button>
        <button
          className={
            "schedule-view-tab" +
            (view === "socials" ? " schedule-view-tab-active" : "")
          }
          onClick={() => setView("socials")}
        >
          Social
        </button>
      </div>

      <div className="schedule-filter-row">
        <input
          type="search"
          className="schedule-search-input"
          placeholder="Search events, tracks, rooms…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Track dropdown only when Seminars view is active */}
        {view === "sessions" && tracks.length > 0 && (
          <select
            className="schedule-track-select"
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
          >
            <option value="all">All tracks</option>
            {tracks.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
