// src/config.js
// Base URL for the CNIGA site
export const WP_BASE_URL = "https://cniga.com";

// All the WIGC sponsorship group posts (by slug) and the labels to show in the app
export const SPONSOR_GROUPS = [
  { slug: "wigc-title-sponsor", label: "Title Sponsors" },
  { slug: "wigc-sponsors-gold", label: "Gold Sponsors" },
  { slug: "wigc-sponsors-silver", label: "Silver Sponsors" },
  { slug: "wigc-sponsors-bronze", label: "Bronze Sponsors" },
  { slug: "wigc-room-key-sponsor", label: "Hotel Card Key Sponsor" },
  { slug: "wigc-sponsors-awards-luncheon", label: "Award Luncheon Sponsors" },
  { slug: "wigc-welcome-reception", label: "Welcome Reception Sponsors" },
  { slug: "wigc-sponsors-happy-hour", label: "Happy Hour Sponsors" },
  { slug: "wigc-panel-sponsor", label: "Panel Sponsors" },
  { slug: "wigc-continental-breakfast", label: "Continental Breakfast Sponsors" },
  { slug: "wigc-network-break", label: "Network Break Sponsors" },
  { slug: "wigc-basic-sponsor", label: "Basic Sponsors" },
  { slug: "wigc-bowling-sponsors-sapphire", label: "Bowling Sapphire Sponsors" },
  { slug: "wigc-bowling-sponsors-opal", label: "Bowling Opal Sponsors" },
  { slug: "wigc-bowling-sponsors-jade", label: "Bowling Jade Sponsors" },
  { slug: "wigc-bowling-sponsorr-turquoise", label: "Bowling Turquoise Sponsor" },
  { slug: "wigc-bowling-sponsors-lane-sponsor", label: "Lane Sponsor" },
  { slug: "wigc-afterparty-sponsors", label: "After Party Sponsors" },
];


// CPT REST slugs where actual sponsor records live
export const SPONSOR_TYPES = ["casinos", "tribal_offices", "associate_members"];

// Event CPT + taxonomy configuration
export const EVENT_CPT_SLUG = "wigc-event";
// Taxonomy: wigc-event-type with term slugs "session" and "social"
export const EVENT_TYPES = {
  sessions: "session",
  socials: "social",
};
