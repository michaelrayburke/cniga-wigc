// src/pages/Schedule.jsx
import { useEffect, useMemo, useState } from "react";
import { fetchScheduleData } from "../api/wp";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import "./Schedule.css";

export default function Schedule() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [socials, setSocials] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [error, setError] = useState("");

  // views: all | mine | sessions | socials
  const [view, setView] = useState("all");
  const [trackFilter, setTrackFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [starredIds, setStarredIds] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [favoritesError, setFavoritesError] = useState("");

  // 1) Load schedule from WP
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

  // 2) Load favorites from Supabase (and migrate localStorage once)
  useEffect(() => {
    let mounted = true;

    async function loadFavorites() {
      if (!user) return;

      setFavoritesLoading(true);
      setFavoritesError("");

      try {
        // Pull favorites from DB
        const { data, error } = await supabase
          .from("attendee_favorites")
          .select("event_id")
          .eq("attendee_id", user.id);

        if (error) throw error;

        const dbIds = (data || []).map((r) => r.event_id);
        if (!mounted) return;

        // One-time migration from legacy localStorage (if any)
        let localIds = [];
        try {
          const raw = localStorage.getItem("cniga_starred_events");
          localIds = raw ? JSON.parse(raw) : [];
        } catch {
          localIds = [];
        }

        const missing = localIds.filter((id) => !dbIds.includes(id));
        if (missing.length) {
          const rows = missing.map((event_id) => ({
            attendee_id: user.id,
            event_id: String(event_id),
          }));

          // upsert is safe because PK is (attendee_id,event_id)
          const { error: upsertErr } = await supabase
            .from("attendee_favorites")
            .upsert(rows);

          if (upsertErr) throw upsertErr;

          // merge ids
          const merged = Array.from(new Set([...dbIds, ...missing]));
          setStarredIds(merged);

          // optional: clear local storage now that DB is source of truth
          try {
            localStorage.removeItem("cniga_starred_events");
          } catch {}
        } else {
          setStarredIds(dbIds);
        }
      } catch (e) {
        console.error(e);
        if (mounted) setFavoritesError(e.message || "Could not load favorites.");
      } finally {
        if (mounted) setFavoritesLoading(false);
      }
    }

    loadFavorites();
    return () => {
      mounted = false;
    };
  }, [user]);

  async function toggleStar(eventId) {
    if (!user) return;

    const id = String(eventId);
    const currentlyStarred = starredIds.includes(id);

    // optimistic UI
    setStarredIds((prev) =>
      currentlyStarred ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setFavoritesError("");

    try {
      if (currentlyStarred) {
        const { error } = await supabase
          .from("attendee_favorites")
          .delete()
          .eq("attendee_id", user.id)
          .eq("event_id", id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("attendee_favorites").insert({
          attendee_id: user.id,
          event_id: id,
        });

        if (error) throw error;
      }
    } catch (e) {
      console.error(e);
      setFavoritesError(e.message || "Could not update favorite.");

      // revert UI on failure
      setStarredIds((prev) =>
        currentlyStarred ? [...prev, id] : prev.filter((x) => x !== id)
      );
    }
  }

  if (loading) return <p className="app-status-text">Loading schedule…</p>;
  if (error) return <p className="app-status-text app-status-error">{error}</p>;

  // Track dropdown options (from sessions)
  const allTracks = useMemo(() => {
    return Array.from(
      new Set(
        sessions
          .map((e) => e.track)
          .filter((t) => t && typeof t === "string")
          .map((t) => t.trim())
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [sessions]);

  // Choose base list by view
  let baseEvents;
  if (view === "sessions") baseEvents = sessions;
  else if (view === "socials") baseEvents = socials;
  else if (view === "mine") baseEvents = allEvents.filter((e) => starredIds.includes(String(e.id)));
  else baseEvents = allEvents;

  // Apply search + track filter
  const filtered = baseEvents.filter((e) => {
    // Track filter allowed for sessions OR mine (mine might include sessions)
    if ((view === "sessions" || view === "mine") && trackFilter !== "all") {
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
      ...(e.speakers || []).map((sp) => sp?.name),
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
          favoritesCount={starredIds.length}
        />
        {favoritesLoading ? (
          <p className="app-status-text">Loading your schedule…</p>
        ) : (
          <p className="app-status-text">No events found for this view.</p>
        )}
        {favoritesError && (
          <p className="app-status-text app-status-error">{favoritesError}</p>
        )}
      </div>
    );
  }

  // Sort + group by day
  const sorted = [...filtered].sort((a, b) => {
    if (a.sortKey && b.sortKey) return a.sortKey.localeCompare(b.sortKey);
    if (a.sortKey) return -1;
    if (b.sortKey) return 1;
    return (a.title || "").localeCompare(b.title || "");
  });

  const dayMap = new Map();
  for (const ev of sorted) {
    const key = ev.dayKey || ev.date || "Other";
    const label = ev.date || "Other";
    if (!dayMap.has(key)) dayMap.set(key, { key, label, events: [] });
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
        favoritesCount={starredIds.length}
      />

      {favoritesError && (
        <p className="app-status-text app-status-error">{favoritesError}</p>
      )}

      {dayGroups.map((day) => (
        <section key={day.key} className="schedule-section">
          <h2 className="schedule-day-heading">{day.label}</h2>
          <div className="schedule-list">
            {day.events.map((e) => {
              const id = String(e.id);
              const starred = starredIds.includes(id);

              return (
                <article key={id} className="schedule-card">
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
                      onClick={() => toggleStar(id)}
                      aria-pressed={starred}
                      aria-label={
                        starred ? "Remove from my schedule" : "Add to my schedule"
                      }
                      disabled={favoritesLoading}
                      title={favoritesLoading ? "Loading…" : starred ? "Remove" : "Add"}
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
                        {e.track && (e.speakers?.length || e.moderator) && " • "}
                        {e.speakers && e.speakers.length > 0 && (
                          <span>
                            Speakers:{" "}
                            {e.speakers
                              .map((sp) => sp?.name || [sp?.firstName, sp?.lastName].filter(Boolean).join(" "))
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
  favoritesCount,
}) {
  return (
    <div className="schedule-filters">
      <div className="schedule-view-tabs">
        <button
          className={"schedule-view-tab" + (view === "all" ? " schedule-view-tab-active" : "")}
          onClick={() => setView("all")}
        >
          Full schedule
        </button>

        <button
          className={"schedule-view-tab" + (view === "mine" ? " schedule-view-tab-active" : "")}
          onClick={() => setView("mine")}
        >
          My schedule{typeof favoritesCount === "number" ? ` (${favoritesCount})` : ""}
        </button>

        <button
          className={"schedule-view-tab" + (view === "sessions" ? " schedule-view-tab-active" : "")}
          onClick={() => setView("sessions")}
        >
          Seminars
        </button>

        <button
          className={"schedule-view-tab" + (view === "socials" ? " schedule-view-tab-active" : "")}
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

        {(view === "sessions" || view === "mine") && tracks.length > 0 && (
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
