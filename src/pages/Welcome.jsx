// src/pages/Welcome.jsx
import { useEffect, useState } from "react";
import { fetchSponsorGroups } from "../api/wp";
import "./Welcome.css";

export default function Welcome() {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchSponsorGroups();
        setGroups(data);
      } catch (err) {
        console.error(err);
        setError("Unable to load sponsors.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <p className="app-status-text">Loading sponsors…</p>;
  }

  if (error) {
    return <p className="app-status-text app-status-error">{error}</p>;
  }

  if (!groups.length) {
    return <p className="app-status-text">No sponsors found.</p>;
  }

  return (
    <div className="welcome-root">
      {/* Heading chip + ghost-yellow welcome box */}
      <div className="welcome-heading">Welcome</div>

      <section className="welcome-intro">
        <h2>Western Indian Gaming Conference 2026</h2>
        <p>
          Thank you for joining us at Pechanga Resort Casino. Use this app to
          explore the schedule, learn about our presenters, and discover the
          sponsors who help make WIGC possible.
        </p>
      </section>

      {/* Sponsors by level */}
      {groups.map((group) => (
        <section key={group.label} className="sponsor-section">
          <h2 className="sponsor-section-title">{group.label}</h2>

          <div className="sponsor-grid">
            {group.sponsors.map((sponsor) => (
              <a
                key={`${sponsor.type}-${sponsor.id}`}
                href={sponsor.website || "#"}
                target={sponsor.website ? "_blank" : undefined}
                rel="noreferrer"
                className="sponsor-card"
              >
                {sponsor.logoUrl ? (
                  <img
                    src={sponsor.logoUrl}
                    alt={sponsor.name}
                    className="sponsor-logo"
                  />
                ) : (
                  <span className="sponsor-name">{sponsor.name}</span>
                )}
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
