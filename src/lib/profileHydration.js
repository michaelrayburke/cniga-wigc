// src/lib/profileHydration.js
import { supabase } from "./supabaseClient";

/**
 * Ensure that the logged-in user has an attendee profile.
 * If no profile exists yet:
 *  - Look up legacy_adalo_profiles by email
 *  - Seed attendees row with name / avatar / bio if found
 *  - Mark created_from = 'adalo' or 'app'
 *
 * Safe to call on every login / signup; it will no-op if profile already exists.
 */
export async function ensureAttendeeProfile(user) {
  if (!user) return;

  const userId = user.id;
  const email = (user.email || "").toLowerCase();

  try {
    // 1) Does an attendee row already exist?
    const { data: existingRows, error: existingError } = await supabase
      .from("attendees")
      .select("id")
      .eq("id", userId)
      .limit(1);

    if (existingError) {
      console.error("Error checking existing attendee profile", existingError);
      // We won't crash login if this fails; just bail out.
      return;
    }

    const existingProfile = existingRows && existingRows[0];

    if (existingProfile) {
      // Profile already exists, nothing to do.
      return;
    }

    // 2) Look for legacy Adalo profile by email
    const { data: legacyRows, error: legacyError } = await supabase
      .from("legacy_adalo_profiles")
      .select("name, phone, bio, avatar_url")
      .eq("email", email)
      .limit(1);

    if (legacyError) {
      console.error("Error looking up legacy Adalo profile", legacyError);
      // Still safe to just create a bare profile
    }

    const legacy = legacyRows && legacyRows[0];

    // 3) Build insert payload
    const payload = {
      id: userId,
      email,
      created_from: legacy ? "adalo" : "app",
    };

    if (legacy) {
      if (legacy.name) payload.name = legacy.name;
      if (legacy.phone) payload.phone = legacy.phone;
      if (legacy.bio) payload.bio = legacy.bio;
      if (legacy.avatar_url) payload.avatar_url = legacy.avatar_url;
    }

    // 4) Insert attendee profile
    const { error: insertError } = await supabase
      .from("attendees")
      .insert(payload);

    if (insertError) {
      console.error("Error inserting attendee profile", insertError);
    }
  } catch (err) {
    console.error("Unexpected error in ensureAttendeeProfile", err);
  }
}
