// src/pages/Profile.jsx
import { useEffect, useMemo, useState } from "react";
import "./Profile.css";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { ensureAttendeeProfile } from "../lib/profileHydration";
import { QRCodeCanvas } from "qrcode.react";

export default function Profile() {
  const { user, signOut } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Attendee profile fields (stored in public.attendees)
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Email (auth email) — updating this triggers Supabase’s email flow
  const [email, setEmail] = useState(user?.email || "");
  const [emailSaving, setEmailSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!user) return;

      setLoading(true);
      setError("");
      setMessage("");

      try {
        // Ensure a profile exists (hydrates from legacy if available)
        await ensureAttendeeProfile(user);

        const { data, error: fetchError } = await supabase
          .from("attendees")
          .select("id,email,name,phone,bio,avatar_url,created_from")
          .eq("id", user.id)
          .single();

        if (fetchError) throw fetchError;

        if (!isMounted) return;

        setName(data?.name || "");
        setPhone(data?.phone || "");
        setBio(data?.bio || "");
        setAvatarUrl(data?.avatar_url || "");
        setEmail(user.email || data?.email || "");
      } catch (e) {
        console.error(e);
        if (isMounted) setError(e.message || "Failed to load profile.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [user]);

  async function handleSaveProfile() {
    if (!user) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        name: name.trim() || null,
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      };

      const { error: updateError } = await supabase
        .from("attendees")
        .update(payload)
        .eq("id", user.id);

      if (updateError) throw updateError;

      setMessage("Profile saved!");
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateEmail() {
    const nextEmail = (email || "").trim().toLowerCase();
    if (!nextEmail) return;

    setEmailSaving(true);
    setError("");
    setMessage("");

    try {
      // Supabase will email them to confirm the new address (depending on settings)
      const { error: updateError } = await supabase.auth.updateUser({
        email: nextEmail,
      });

      if (updateError) throw updateError;

      setMessage(
        "Email update requested. Please check your inbox to confirm the change."
      );
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to update email.");
    } finally {
      setEmailSaving(false);
    }
  }

  const vcard = useMemo(() => {
    const safeName = (name || "").trim();
    const safeEmail = (user?.email || email || "").trim();
    const safePhone = (phone || "").trim();

    // vCard 3.0 is widely supported
    // Note: keep it simple for scanning reliability
    return [
      "BEGIN:VCARD",
      "VERSION:3.0",
      safeName ? `FN:${safeName}` : "FN:WIGC Attendee",
      safeName ? `N:${safeName};;;;` : "N:Attendee;;;;",
      safePhone ? `TEL;TYPE=CELL:${safePhone}` : "",
      safeEmail ? `EMAIL:${safeEmail}` : "",
      "ORG:CNIGA / WIGC",
      "END:VCARD",
    ]
      .filter(Boolean)
      .join("\n");
  }, [name, phone, user?.email, email]);

  function downloadVcf() {
    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "wigc-contact.vcf";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  if (!user) {
    return (


      
      <div className="profile-root">
        <div className="profile-card">
          <h1>My Profile</h1>
          <p>You’re not signed in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-root">
      <div className="profile-card">
        <h1>My Profile</h1>

        {loading ? (
          <p className="profile-subtle">Loading your attendee profile…</p>
        ) : (
          <>
            {error && <p className="profile-error">{error}</p>}
            {message && !error && <p className="profile-message">{message}</p>}

            <div className="profile-grid">
              <div className="profile-avatar">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Your avatar"
                    className="profile-avatar-img"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="profile-avatar-placeholder">No Photo</div>
                )}
              </div>

              <div className="profile-fields">
                <label className="profile-label">
                  Full Name
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
                  Avatar URL
                  <input
                    className="profile-input"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://…"
                  />
                </label>
              </div>
            </div>

            <label className="profile-label">
              Bio
              <textarea
                className="profile-textarea"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short bio you’d like other attendees to see…"
                rows={5}
              />
            </label>

            <div className="profile-actions">
              <button
                className="profile-button"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Profile"}
              </button>

              <button className="profile-button secondary" onClick={signOut}>
                Log out
              </button>
            </div>

            <hr className="profile-divider" />

            <div className="profile-email-block">
              <h2 className="profile-section-title">Email</h2>
              <p className="profile-subtle">
                Changing your email may require confirmation via email.
              </p>

              <div className="profile-email-row">
                <input
                  className="profile-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
                <button
                  className="profile-button"
                  onClick={handleUpdateEmail}
                  disabled={emailSaving}
                >
                  {emailSaving ? "Updating…" : "Update Email"}
                </button>
              </div>
            </div>

            <hr className="profile-divider" />

            <div className="profile-qr">
              <h2 className="profile-section-title">My QR Contact Card</h2>
              <p className="profile-subtle">
                Let another attendee scan this to save your contact info.
              </p>

              <div className="profile-qr-box">
                <QRCodeCanvas value={vcard} size={180} />
              </div>

              <button className="profile-button secondary" onClick={downloadVcf}>
                Download vCard (.vcf)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
