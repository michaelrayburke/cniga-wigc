// src/api/wp.js (React Native safe)
import he from "he";
import {
  WP_BASE_URL,
  SPONSOR_GROUPS,
  SPONSOR_TYPES,
  EVENT_CPT_SLUG,
  EVENT_TYPES,
} from "../config";

function decodeHtmlEntities(str = "") {
  if (!str) return "";
  return he.decode(str);
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

async function fetchSponsorshipGroupPost(slug) {
  const url = `${WP_BASE_URL}/wp-json/wp/v2/sponsorships?slug=${encodeURIComponent(slug)}`;
  const items = await fetchJson(url);
  return items[0] || null;
}

async function fetchSingleSponsor({ id, type }) {
  if (!id || !type) return null;
  if (!SPONSOR_TYPES.includes(type)) return null;

  const url = `${WP_BASE_URL}/wp-json/wp/v2/${type}/${id}?_embed=1`;
  const data = await fetchJson(url);

  const media = data._embedded?.["wp:featuredmedia"]?.[0];
  const featuredLogo =
    media?.source_url ||
    media?.media_details?.sizes?.medium?.source_url ||
    media?.media_details?.sizes?.thumbnail?.source_url ||
    null;

  const acfLogo = data.acf?.image?.url || null;

  return {
    id: data.id,
    type,
    name: decodeHtmlEntities(data.title?.rendered || ""),
    logoUrl: featuredLogo || acfLogo,
    website: data.acf?.website || data.website || null,
  };
}

function normalizeRelItem(raw) {
  if (raw && typeof raw === "object") {
    return { id: raw.ID || raw.id, type: raw.post_type };
  }
  if (typeof raw === "number") return { id: raw, type: null };
  return null;
}

// Public: get groups like [{ label, sponsors: [...] }, ...]
export async function fetchSponsorGroups() {
  const groups = [];

  for (const group of SPONSOR_GROUPS) {
    let post;
    try {
      post = await fetchSponsorshipGroupPost(group.slug);
    } catch {
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
      } catch {}
    }

    if (sponsors.length) groups.push({ label: group.label, sponsors });
  }

  return groups;
}

/**
 * EVENTS / SCHEDULE
 */

async function fetchPresentersByIds(ids) {
  if (!ids || !ids.length) return {};

  const unique = Array.from(new Set(ids));
  const url = `${WP_BASE_URL}/wp-json/wp/v2/presenter?per_page=100&include=${unique.join(",")}`;
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
      const cleaned = dateLabel.replace(/^[A-Za-z]+,\s*/, "");
      const dateTimeStr = startStr ? `${cleaned} ${startStr}` : cleaned;
      const d = new Date(dateTimeStr);
      if (!isNaN(d.getTime())) {
        sortKey = d.toISOString();
        dayKey = sortKey.slice(0, 10);
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

        if (term.taxonomy === "wigc-event-type") {
          if (term.slug) kinds.push(term.slug);
        }
        if (term.taxonomy === "room" && !roomName) {
          roomName = term.name;
        }
        if (term.taxonomy === "track" && !trackName) {
          trackName = term.name;
        }
      }
    }

    if (!trackName && acf.track) trackName = acf.track;

    const speakerIds = Array.isArray(acf.speakers) ? acf.speakers : [];
    const moderatorId = typeof acf.moderator === "number" ? acf.moderator : null;

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

// Public: fetch schedule and split into sessions / socials / all
export async function fetchScheduleData() {
  const rawEvents = await fetchAllEvents();

  const presenterIdSet = new Set();
  for (const ev of rawEvents) {
    (ev.speakerIds || []).forEach((id) => presenterIdSet.add(id));
    if (ev.moderatorId) presenterIdSet.add(ev.moderatorId);
  }

  const presenters =
    presenterIdSet.size > 0 ? await fetchPresentersByIds(Array.from(presenterIdSet)) : {};

  const attachPeople = (ev) => ({
    ...ev,
    speakers: (ev.speakerIds || []).map((id) => presenters[id]).filter(Boolean),
    moderator: ev.moderatorId ? presenters[ev.moderatorId] || null : null,
  });

  const allEvents = rawEvents.map(attachPeople);

  const sessions = allEvents.filter((ev) => ev.kinds?.includes(EVENT_TYPES.sessions));
  const socials = allEvents.filter((ev) => ev.kinds?.includes(EVENT_TYPES.socials));

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
      sessionsSpeaker: Array.isArray(acf.sessions_speaker) ? acf.sessions_speaker : [],
    };
  });
}
