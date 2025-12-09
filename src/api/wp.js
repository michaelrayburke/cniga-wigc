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
    // Decode HTML entities here so AT&#038;T → AT&T
    name: decodeHtmlEntities(data.title?.rendered || ""),
    logoUrl: featuredLogo || acfLogo,
    // Prefer ACF website, then top-level website field
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
    // Relationship returning IDs only — you'd need extra info to know the CPT
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
    if (!post || !Array.isArray(rel) || !rel.length) {
      continue;
    }

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

// Fetch WIGC events filtered by event-type taxonomy (session / social)
async function fetchEventsByType(termSlug) {
  // Ask WP to embed taxonomies so we can get room / track names
  const url = `${WP_BASE_URL}/wp-json/wp/v2/${EVENT_CPT_SLUG}?per_page=100&event-type=${encodeURIComponent(
    termSlug
  )}&_embed=1`;
  const items = await fetchJson(url);

  return items.map((item) => {
    const acf = item.acf || {};

    // ── Taxonomy terms: room, track (if track is also a taxonomy later)
    let roomName = null;
    let trackName = null;

    const termGroups = item._embedded?.["wp:term"] || [];
    for (const group of termGroups) {
      for (const term of group) {
        if (!term || !term.taxonomy) continue;
        if (term.taxonomy === "room" && !roomName) {
          roomName = term.name;
        }
        if (term.taxonomy === "track" && !trackName) {
          trackName = term.name;
        }
      }
    }

    // Fallback: ACF "track" text field if taxonomy not used
    if (!trackName && acf.track) {
      trackName = acf.track;
    }

    // Speakers / moderator are relationships to presenter CPT
    const speakerIds = Array.isArray(acf.speakers) ? acf.speakers : [];
    const moderatorId =
      typeof acf.moderator === "number" ? acf.moderator : null;

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
      // Date / time from ACF
      date: acf["event-date"] || null,
      startTime: acf["event-time-start"] || null,
      endTime: acf["event-time-end"] || null,
      // Location-ish meta
      room: roomName,
      track: trackName,
      // Raw IDs for later enrichment
      speakerIds,
      moderatorId,
      // Full description HTML
      contentHtml: descriptionHtml,
    };
  });
}

// Public: fetch both sessions and socials, and attach presenter objects
export async function fetchScheduleData() {
  const [sessionsRaw, socialsRaw] = await Promise.all([
    fetchEventsByType(EVENT_TYPES.sessions),
    fetchEventsByType(EVENT_TYPES.socials),
  ]);

  // Collect all presenter IDs from both lists
  const presenterIdSet = new Set();
  for (const ev of [...sessionsRaw, ...socialsRaw]) {
    (ev.speakerIds || []).forEach((id) => presenterIdSet.add(id));
    if (ev.moderatorId) presenterIdSet.add(ev.moderatorId);
  }

  const presenters =
    presenterIdSet.size > 0
      ? await fetchPresentersByIds(Array.from(presenterIdSet))
      : {};

  function attachPeople(events) {
    return events.map((ev) => ({
      ...ev,
      speakers: (ev.speakerIds || [])
        .map((id) => presenters[id])
        .filter(Boolean),
      moderator: ev.moderatorId ? presenters[ev.moderatorId] || null : null,
    }));
  }

  const sessions = attachPeople(sessionsRaw);
  const socials = attachPeople(socialsRaw);

  return { sessions, socials };
}
