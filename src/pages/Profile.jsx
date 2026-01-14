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
  <div style={{ padding: 20, background: "yellow", color: "black", fontWeight: 900 }}>
    THIS IS THE NEW PROFILE.JSX ✅
  </div>
    );
  }

  return (  <div style={{ padding: 20, background: "yellow", color: "black", fontWeight: 900 }}>
    THIS IS THE NEW PROFILE.JSX ✅
  </div>
  );
}
