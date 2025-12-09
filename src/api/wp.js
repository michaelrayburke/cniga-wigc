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

// Fetch WIGC events filtered by event-type taxonomy (session / social)
async function fetchEventsByType(termSlug) {
  // Uses event-type taxonomy query var
  const url = `${WP_BASE_URL}/wp-json/wp/v2/${EVENT_CPT_SLUG}?per_page=100&event-type=${encodeURIComponent(
    termSlug
  )}`;
  const items = await fetchJson(url);

  return items.map((item) => {
    const acf = item.acf || {};

    return {
      id: item.id,
      // Decode entities for event titles too, just in case
      title: decodeHtmlEntities(item.title?.rendered || ""),
      // These fields are optional; they'll just be blank if not present
      date: acf.date || null,
      startTime: acf.start_time || acf.time || null,
      endTime: acf.end_time || null,
      location: acf.location || acf.room || null,
      contentHtml: item.content?.rendered || "",
    };
  });
}

// Public: fetch both sessions and socials
export async function fetchScheduleData() {
  const [sessions, socials] = await Promise.all([
    fetchEventsByType(EVENT_TYPES.sessions),
    fetchEventsByType(EVENT_TYPES.socials),
  ]);

  return { sessions, socials };
}
