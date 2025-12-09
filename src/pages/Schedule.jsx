// src/pages/Schedule.jsx
import { useEffect, useState } from "react";
import { fetchScheduleData } from "../api/wp";
import "./Schedule.css";

export default function Schedule() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [socials, setSocials] = useState([]);
  const [error, setError] = useState("");
  const [view, setView] = useState("all"); // all | sessions | socials

  useEffect(() => {
    (async () => {
      try {
        const { sessions, socials } = await fetchScheduleData();
        setSessions(sessions);
        setSocials(socials);
      } catch (err) {
        console.error(err);
        setError("Unable to load schedule.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <p className="app-status-text">Loading schedule…</p>;
  }

  if (error) {
    return <p className="app-status-text app-status-error">{error}</p>;
  }

  const allEvents = [...sessions, ...socials];

  let baseEvents;
  if (view === "sessions") {
    baseEvents = sessions;
  } else if (view === "socials") {
    baseEvents = socials;
  } else {
    baseEvents = allEvents;
  }

  if (!baseEvents.length) {
    return (
      <>
        <ScheduleFilters view={view} setView={setView} />
        <p className="app-status-text">No events found for this view.</p>
      </>
    );
  }

  // Sort by sortKey, fallback by title
  const sorted = [...baseEvents].sort((a, b) => {
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
      <ScheduleFilters view={view} setView={setView} />

      {dayGroups.map((day) => (
        <section key={day.key} className="schedule-section">
          <h2>{day.label}</h2>
          <div className="schedule-list">
            {day.events.map((e) => (
              <article key={e.id} className="schedule-card">
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

function ScheduleFilters({ view, setView }) {
  return (
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
  );
}
