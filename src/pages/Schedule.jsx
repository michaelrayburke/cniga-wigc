// src/pages/Schedule.jsx
import { useEffect, useState } from "react";
import { fetchScheduleData } from "../api/wp";
import "./Schedule.css";

export default function Schedule() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [socials, setSocials] = useState([]);
  const [error, setError] = useState("");

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

  const hasSessions = sessions && sessions.length > 0;
  const hasSocials = socials && socials.length > 0;

  if (!hasSessions && !hasSocials) {
    return <p className="app-status-text">No events found.</p>;
  }

  return (
    <div className="schedule-root">
      {hasSessions && (
        <section className="schedule-section">
          <h2>Seminars &amp; Sessions</h2>
          <div className="schedule-list">
            {sessions.map((e) => (
              <article key={e.id} className="schedule-card">
                <div className="schedule-meta">
                  {(e.date || e.startTime || e.location) && (
                    <p>
                      {e.date && <span>{e.date}</span>}
                      {e.date && (e.startTime || e.endTime) && " • "}
                      {e.startTime && (
                        <span>
                          {e.startTime}
                          {e.endTime ? `–${e.endTime}` : ""}
                        </span>
                      )}
                      {e.location && (
                        <>
                          {" • "}
                          <span>{e.location}</span>
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
      )}

      {hasSocials && (
        <section className="schedule-section">
          <h2>Social Events</h2>
          <div className="schedule-list">
            {socials.map((e) => (
              <article key={e.id} className="schedule-card">
                <div className="schedule-meta">
  {(e.date || e.startTime || e.endTime || e.room) && (
    <p>
      {e.date && <span>{e.date}</span>}
      {e.date && (e.startTime || e.endTime) && " • "}
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

  {(e.track || (e.speakers && e.speakers.length) || e.moderator) && (
    <p>
      {e.track && <span>Track: {e.track}</span>}
      {e.track && (e.speakers?.length || e.moderator) && " • "}
      {e.speakers && e.speakers.length > 0 && (
        <span>
          Speakers:{" "}
          {e.speakers
            .map((sp) => sp?.name || [sp.firstName, sp.lastName].filter(Boolean).join(" "))
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
      )}
    </div>
  );
}
