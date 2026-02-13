// src/pages/Presenters.jsx
import { useEffect, useMemo, useState } from "react";
import { fetchScheduleData, fetchPresentersList } from "../api/wp";
import "./Presenters.css";

function normalizeAvatarUrl(value) {
  if (!value) return "";
  const v = String(value).trim();

  // If Adalo imported JSON like {"url":"https://...","filename":"..."}
  if (v.startsWith("{")) {
    try {
      const obj = JSON.parse(v);
      if (obj?.url) return obj.url;
    } catch {
      // ignore
    }
  }

  // Otherwise assume it's already a URL
  return v;
}


export default function Presenters() {
  const [loading, setLoading] = useState(true);
  const [presenters, setPresenters] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [{ sessions }, presenters] = await Promise.all([
          fetchScheduleData(),
          fetchPresentersList(),
        ]);
        setSessions(sessions);
        setPresenters(presenters);
        if (presenters.length) {
          const params = new URLSearchParams(window.location.search);
          const paramId = params.get("presenterId");
          const match = paramId
            ? presenters.find((x) => String(x.id) === String(paramId))
            : null;
          setSelectedId(match ? match.id : presenters[0].id);
        }
      } catch (err) {
        console.error(err);
        setError("Unable to load presenters.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const searchTerm = search.trim().toLowerCase();

  const filteredPresenters = useMemo(() => {
    if (!searchTerm) return presenters;
    return presenters.filter((p) => {
      const haystack = [
        p.name,
        p.firstName,
        p.lastName,
        p.title,
        p.org,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchTerm);
    });
  }, [presenters, searchTerm]);

  const presenterMap = useMemo(() => {
    const map = new Map();
    presenters.forEach((p) => map.set(p.id, p));
    return map;
  }, [presenters]);

  const sessionsByPresenter = useMemo(() => {
    const map = new Map();
    presenters.forEach((p) => {
      map.set(p.id, { speaking: [], moderating: [] });
    });

    sessions.forEach((session) => {
      const speakerIds = Array.isArray(session.speakerIds)
        ? session.speakerIds
        : [];
      const moderatorId = session.moderatorId || null;

      speakerIds.forEach((id) => {
        if (!map.has(id)) {
          map.set(id, { speaking: [], moderating: [] });
        }
        map.get(id).speaking.push(session);
      });

      if (moderatorId) {
        if (!map.has(moderatorId)) {
          map.set(moderatorId, { speaking: [], moderating: [] });
        }
        map.get(moderatorId).moderating.push(session);
      }
    });

    return map;
  }, [presenters, sessions]);

  const selectedPresenter = selectedId ? presenterMap.get(selectedId) : null;
  const selectedSessions = selectedId
    ? sessionsByPresenter.get(selectedId) || { speaking: [], moderating: [] }
    : { speaking: [], moderating: [] };

  if (loading) {
    return <p className="app-status-text">Loading presenters…</p>;
  }

  if (error) {
    return <p className="app-status-text app-status-error">{error}</p>;
  }

  return (
    <div className="presenters-root">
      <div className="presenters-list-panel">
        <div className="presenters-search">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search presenters…"
          />
        </div>

        <div className="presenters-list">
          {filteredPresenters.map((p) => (
            <button
              key={p.id}
              className={
                "presenter-list-item" +
                (p.id === selectedId ? " presenter-list-item-active" : "")
              }
              onClick={() => {
                setSelectedId(p.id);
                const url = new URL(window.location.href);
                url.searchParams.set("presenterId", String(p.id));
                window.history.replaceState({}, "", url.toString());
              }}
            >
              {p.photo && (
                <img
                  src={p.photo}
                  alt={p.name}
                  className="presenter-avatar-small"
                />
              )}
              <div className="presenter-list-text">
                <div className="presenter-name">{p.name}</div>
                {(p.title || p.org) && (
                  <div className="presenter-sub">
                    {[p.title, p.org].filter(Boolean).join(" • ")}
                  </div>
                )}
              </div>
            </button>
          ))}

          {!filteredPresenters.length && (
            <p className="app-status-text">No presenters found.</p>
          )}
        </div>
      </div>

      <div className="presenters-detail-panel">
        {selectedPresenter ? (
          <PresenterDetail
            presenter={selectedPresenter}
            sessionsSpeaking={selectedSessions.speaking}
            sessionsModerating={selectedSessions.moderating}
          />
        ) : (
          <p className="app-status-text">Select a presenter to view details.</p>
        )}
      </div>
    </div>
  );
}

function PresenterDetail({
  presenter,
  sessionsSpeaking,
  sessionsModerating,
}) {
  return (
    <div className="presenter-detail">
      <div className="presenter-header">
        {presenter.photo && (
          <img
            src={presenter.photo}
            alt={presenter.name}
            className="presenter-avatar-large"
          />
        )}
        <div>
          <h2>{presenter.name}</h2>
          {(presenter.title || presenter.org) && (
            <p className="presenter-sub">
              {[presenter.title, presenter.org].filter(Boolean).join(" • ")}
            </p>
          )}
        </div>
      </div>

      {presenter.bioHtml && (
        <div
          className="presenter-bio"
          dangerouslySetInnerHTML={{ __html: presenter.bioHtml }}
        />
      )}

      <div className="presenter-sessions">
        {sessionsModerating.length > 0 && (
          <section>
            <h3>Moderating</h3>
            <ul>
              {sessionsModerating.map((s) => (
                <li key={s.id}>{s.title}</li>
              ))}
            </ul>
          </section>
        )}

        {sessionsSpeaking.length > 0 && (
          <section>
            <h3>Speaking</h3>
            <ul>
              {sessionsSpeaking.map((s) => (
                <li key={s.id}>{s.title}</li>
              ))}
            </ul>
          </section>
        )}

        {sessionsModerating.length === 0 &&
          sessionsSpeaking.length === 0 && (
            <p className="app-status-text">
              No sessions associated yet for this presenter.
            </p>
          )}
      </div>
    </div>
  );
}
