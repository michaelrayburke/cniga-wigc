// src/api/wp.js
import {
  WP_BASE_URL,
  SPONSOR_GROUPS,
  SPONSOR_TYPES,
  EVENT_CPT_SLUG,
  EVENT_TYPES,
} from "../config";

// Decode things like AT&#038;T → AT&T
function decodeHtmlEntities(str = "") {
  if (!str) return "";
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} for ${url}`);
  }
  return res.json();
}

/**
 * SPONSORS
 */

// Get a sponsorship group (CPT: sponsorships) by its slug
async function fetchSponsorshipGroupPost(slug) {
  const url = `${WP_BASE_URL}/wp-json/wp/v2/sponsorships?slug=${encodeURIComponent(
    slug
  )}`;
  const items = await fetchJson(url);
  return items[0] || null;
}

// Fetch one sponsor given { id, type } where type is e.g. "casinos"
async function fetchSingleSponsor({ id, type }) {
  if (!id || !type) return null;
  if (!SPONSOR_TYPES.includes(type)) {
    console.warn("Unknown sponsor type:", type);
    return null;
  }

  // Ask WP to embed featured media so we can grab the logo in one request
  const url = `${WP_BASE_URL}/wp-json/wp/v2/${type}/${id}?_embed=1`;
  const data = await fetchJson(url);

  // Try to get the featured image URL from _embedded
  const media = data._embedded?.["wp:featuredmedia"]?.[0];
  const featuredLogo =
    media?.source_url ||
    media?.media_details?.sizes?.medium?.source_url ||
    media?.media_details?.sizes?.thumbnail?.source_url ||
    null;

  // Fallback to ACF image if there is no featured image
  const acfLogo = data.acf?.image?.url || null;

  return {
    id: data.id,
    type,
    name: decodeHtmlEntities(data.title?.rendered || ""),
    logoUrl: featuredLogo || acfLogo,
    website: data.acf?.website || data.website || null,
  };
}

// Normalize one ACF relationship item (we expect Post Object)
function normalizeRelItem(raw) {
  if (raw && typeof raw === "object") {
    return {
      id: raw.ID || raw.id,
      type: raw.post_type,
    };
  }
  if (typeof raw === "number") {
    return { id: raw, type: null };
  }
  return null;
}

// Public: get groups like [{ label, sponsors: [...] }, ...]
export async function fetchSponsorGroups() {
  const groups = [];

  for (const group of SPONSOR_GROUPS) {
    let post;
    try {
      post = await fetchSponsorshipGroupPost(group.slug);
    } catch (err) {
      console.error("Error fetching sponsorship group", group.slug, err);
      continue;
    }

    const rel = post?.acf?.select_sponsors;
    if (!post || !Array.isArray(rel) || !rel.length) continue;

    const normalized = rel
      .map(normalizeRelItem)
      .filter((item) => item && item.id && item.type);

    const sponsors = [];
    for (const item of normalized) {
      try {
        const sponsor = await fetchSingleSponsor(item);
        if (sponsor) sponsors.push(sponsor);
      } catch (err) {
        console.error("Error fetching sponsor", item, err);
      }
    }

    if (sponsors.length) {
      groups.push({
        label: group.label,
        sponsors,
      });
    }
  }

  return groups;
}

/**
 * EVENTS / SCHEDULE
 */

// Helper: fetch presenters by IDs (used for speakers / moderator)
async function fetchPresentersByIds(ids) {
  if (!ids || !ids.length) return {};

  const unique = Array.from(new Set(ids));
  const url = `${WP_BASE_URL}/wp-json/wp/v2/presenter?per_page=100&include=${unique.join(
    ","
  )}`;
  const items = await fetchJson(url);

  const map = {};
  for (const p of items) {
    map[p.id] = {
      id: p.id,
      name: decodeHtmlEntities(p.title?.rendered || ""),
      firstName: p.acf?.first_name || "",
      lastName: p.acf?.last_name || "",
      title: p.acf?.presentertitle || "",
      org: p.acf?.presenterorg || "",
      photo: p.acf?.presenterphoto || null,
    };
  }
  return map;
}

// Fetch ALL WIGC events once, with embedded taxonomies
async function fetchAllEvents() {
  const url = `${WP_BASE_URL}/wp-json/wp/v2/${EVENT_CPT_SLUG}?per_page=100&_embed=1`;
  const items = await fetchJson(url);

  return items.map((item) => {
    const acf = item.acf || {};

    // Date + time from ACF
    const dateLabel = acf["event-date"] || null;
    const startStr = acf["event-time-start"] || null;

    let sortKey = null;
    let dayKey = null;
    if (dateLabel) {
      // "Thursday, February 27, 2025" → "February 27, 2025 11:10 am"
      const cleaned = dateLabel.replace(/^[A-Za-z]+,\s*/, "");
      const dateTimeStr = startStr ? `${cleaned} ${startStr}` : cleaned;
      const d = new Date(dateTimeStr);
      if (!isNaN(d.getTime())) {
        sortKey = d.toISOString(); // full ordering key
        dayKey = sortKey.slice(0, 10); // YYYY-MM-DD for grouping
      }
    }

    // Taxonomy terms: event type, room, maybe track
    let roomName = null;
    let trackName = null;
    const kinds = [];

    const termGroups = item._embedded?.["wp:term"] || [];
    for (const group of termGroups) {
      for (const term of group) {
        if (!term || !term.taxonomy) continue;

        if (term.taxonomy === "wigc-event-type" && term.slug) {
          kinds.push(term.slug);
        }
        if (term.taxonomy === "room" && !roomName) {
          roomName = term.name;
        }
        if (term.taxonomy === "track" && !trackName) {
          trackName = term.name;
        }
      }
    }

    // Fallback: ACF track (supports text field OR select dropdown return formats)
    if (!trackName) {
      const rawTrack =
        acf.track ??
        acf["event-track"] ??
        acf.event_track ??
        acf["seminar-track"] ??
        acf.seminar_track ??
        null;

      if (rawTrack) {
        if (typeof rawTrack === "string") {
          trackName = rawTrack;
        } else if (Array.isArray(rawTrack)) {
          trackName = rawTrack.filter(Boolean).join(", ");
        } else if (typeof rawTrack === "object") {
          trackName = rawTrack.label ?? rawTrack.value ?? rawTrack.name ?? "";
        }

        if (trackName) {
          trackName = decodeHtmlEntities(String(trackName)).trim();
        }
      }
    }

    // Speakers / moderator are relationships to presenter CPT
    // NOTE: speakers is a relationship field returning IDs
    const speakerIds = Array.isArray(acf.speakers)
      ? acf.speakers
          .map((x) => (typeof x === "string" ? parseInt(x, 10) : x))
          .filter(Boolean)
      : [];

    // NOTE: moderator relationship may be: [id], id, "id", Post Object, or [Post Object]
    const moderatorArr = Array.isArray(acf.moderator)
      ? acf.moderator
      : acf.moderator
      ? [acf.moderator]
      : [];

    const moderatorRaw = moderatorArr[0] ?? null;

    const moderatorId =
      typeof moderatorRaw === "number"
        ? moderatorRaw
        : typeof moderatorRaw === "string"
        ? parseInt(moderatorRaw, 10) || null
        : moderatorRaw && typeof moderatorRaw === "object"
        ? moderatorRaw.ID || moderatorRaw.id || null
        : null;

    // Description field can be either session-description or event_description
    const descriptionHtml =
      acf["session-description"] ||
      acf.session_description ||
      acf.event_description ||
      acf["event-description"] ||
      item.content?.rendered ||
      "";

    return {
      id: item.id,
      title: decodeHtmlEntities(item.title?.rendered || ""),
      date: dateLabel,
      startTime: acf["event-time-start"] || null,
      endTime: acf["event-time-end"] || null,
      room: roomName,
      track: trackName,
      speakerIds,
      moderatorId,
      contentHtml: descriptionHtml,
      sortKey,
      dayKey,
      kinds,
    };
  });
}

// Public: fetch schedule and split into sessions / socials / all (deduped)
export async function fetchScheduleData() {
  const rawEvents = await fetchAllEvents();

  // Collect all presenter IDs from all events
  const presenterIdSet = new Set();
  for (const ev of rawEvents) {
    (ev.speakerIds || []).forEach((id) => presenterIdSet.add(id));
    if (ev.moderatorId) presenterIdSet.add(ev.moderatorId);
  }

  const presenters =
    presenterIdSet.size > 0
      ? await fetchPresentersByIds(Array.from(presenterIdSet))
      : {};

  const attachPeople = (ev) => ({
    ...ev,
    speakers: (ev.speakerIds || []).map((id) => presenters[id]).filter(Boolean),
    moderator: ev.moderatorId ? presenters[ev.moderatorId] || null : null,
  });

  const allEvents = rawEvents.map(attachPeople);

  const sessions = allEvents.filter((ev) =>
    ev.kinds?.includes(EVENT_TYPES.sessions)
  );
  const socials = allEvents.filter((ev) =>
    ev.kinds?.includes(EVENT_TYPES.socials)
  );

  return { sessions, socials, allEvents };
}

// Public: fetch all presenters with full profile info
export async function fetchPresentersList() {
  const url = `${WP_BASE_URL}/wp-json/wp/v2/presenter?per_page=100`;
  const items = await fetchJson(url);

  return items.map((p) => {
    const acf = p.acf || {};
    return {
      id: p.id,
      name: decodeHtmlEntities(p.title?.rendered || ""),
      firstName: acf.first_name || "",
      lastName: acf.last_name || "",
      title: acf.presentertitle || "",
      org: acf.presenterorg || "",
      bioHtml: acf.bio || "",
      photo: acf.presenterphoto || null,
      sessionsSpeaker: Array.isArray(acf.sessions_speaker)
        ? acf.sessions_speaker
        : [],
    };
  });
}
