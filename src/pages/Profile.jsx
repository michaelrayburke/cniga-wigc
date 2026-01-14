// src/pages/Profile.jsx
import { useEffect, useMemo, useState } from "react";
import "./Profile.css";

import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { ensureAttendeeProfile } from "../lib/profileHydration";
import { QRCodeCanvas } from "qrcode.react";

export default function Profile() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Editable fields
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      setError("");
      setMessage("");
      setLoading(true);

      try {
        if (!user?.id) throw new Error("Not signed in.");

        // Make sure attendee profile exists and is hydrated for legacy users
        await ensureAttendeeProfile(user);

        const { data, error: fetchError } = await supabase
          .from("attendees")
          .select("email, name, phone, bio, avatar_url")
          .eq("id", user.id)
          .single();

        if (fetchError) throw fetchError;

        if (!alive) return;

        setEmail(data?.email || user.email || "");
        setName(data?.name || "");
        setPhone(data?.phone || "");
        setBio(data?.bio || "");
        setAvatarUrl(data?.avatar_url || "");
      } catch (err) {
        console.error(err);
        if (!alive) return;
        setError(err.message || "Failed to load profile.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [user?.id]);

  async function handleSave() {
    setError("");
    setMessage("");
    setSaving(true);

    try {
      if (!user?.id) throw new Error("Not signed in.");

      const payload = {
        // email is usually not editable here; we keep it synced
        email: (email || user.email || "").trim(),
        name: name.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl.trim(),
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("attendees")
        .update(payload)
        .eq("id", user.id);

      if (updateError) throw updateError;

      setMessage("Profile saved!");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  // Build a vCard string for QR scanning
  const vcardText = useMemo(() => {
    const safeName = (name || "").trim();
    const safePhone = (phone || "").trim();
    const safeEmail = (email || user?.email || "").trim();

    // Minimal, widely compatible vCard
    // (We can add organization/title later)
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      safeName ? `FN:${escapeVCard(safeName)}` : "FN:WIGC Attendee",
      safePhone ? `TEL;TYPE=CELL:${escapeVCard(safePhone)}` : null,
      safeEmail ? `EMAIL:${escapeVCard(safeEmail)}` : null,
      "END:VCARD",
    ].filter(Boolean);

    return lines.join("\n");
  }, [name, phone, email, user?.email]);

  if (loading) {
    return (
      <div className="profile-root">
        <section className="profile-card">
          <h1>My Profile</h1>
          <p className="profile-subtle">Loading your profile…</p>
        </section>
      </div>
    );
  }

  return (
    <div className="profile-root">
      <section className="profile-card">
        <div className="profile-header-row">
          <div className="profile-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Your profile" />
            ) : (
              <div className="profile-avatar-placeholder">👤</div>
            )}
          </div>

          <div className="profile-header-text">
            <h1>My Profile</h1>
            <p className="profile-subtle">
              Your profile is private to the app. You can update it any time.
            </p>
          </div>
        </div>

        {error && <p className="profile-error">{error}</p>}
        {message && !error && <p className="profile-message">{message}</p>}

        <div className="profile-form">
          <label className="profile-label">
            Email (used for login)
            <input
              className="profile-input"
              value={email}
              disabled
              readOnly
            />
          </label>

          <label className="profile-label">
            Name
            <input
              className="profile-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </label>

          <label className="profile-label">
            Phone
            <input
              className="profile-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 555-5555"
              inputMode="tel"
            />
          </label>

          <label className="profile-label">
            Bio
            <textarea
              className="profile-textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell people a little about you…"
              rows={5}
            />
          </label>

          <label className="profile-label">
            Profile image URL (temporary)
            <input
              className="profile-input"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
            />
            <span className="profile-help">
              Later we’ll replace this with real uploads using Supabase Storage.
            </span>
          </label>

          <button
            type="button"
            className="profile-save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </section>

      <section className="profile-card profile-card-qr">
        <h2>My QR Code</h2>
        <p className="profile-subtle">
          Let someone scan this to add you as a contact.
        </p>

        <div className="profile-qr-wrap">
          <QRCodeCanvas value={vcardText} size={220} />
        </div>

        <details className="profile-vcard-details">
          <summary>Preview vCard data</summary>
          <pre className="profile-vcard-pre">{vcardText}</pre>
        </details>
      </section>
    </div>
  );
}

function escapeVCard(input) {
  return String(input)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}
