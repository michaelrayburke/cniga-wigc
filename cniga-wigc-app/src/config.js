// src/config.js
export const WP_BASE_URL = process.env.EXPO_PUBLIC_WP_BASE_URL || "https://cniga.com";

export const SPONSOR_GROUPS = [
  { slug: "wigc-title-sponsor", label: "Title Sponsors" },
  { slug: "wigc-sponsors-gold", label: "Gold Sponsors" },
  { slug: "wigc-sponsors-silver", label: "Silver Sponsors" },
  { slug: "wigc-sponsors-bronze", label: "Bronze Sponsors" },
  { slug: "wigc-room-key-sponsor", label: "Hotel Card Key Sponsor" },
  { slug: "wigc-sponsors-awards-luncheon", label: "Award Luncheon Sponsors" },
  { slug: "wigc-trade-show-luncheon-sponsor", label: "Trade Show Luncheon Sponsors" },
  { slug: "wigc-welcome-reception", label: "Welcome Reception Sponsors" },
  { slug: "wigc-sponsors-happy-hour", label: "Happy Hour Sponsors" },
  { slug: "wigc-panel-sponsor", label: "Panel Sponsors" },
  { slug: "wigc-continental-breakfast", label: "Continental Breakfast Sponsors" },
  { slug: "wigc-network-break", label: "Network Break Sponsors" },
  { slug: "wigc-basic-sponsor", label: "Basic Sponsors" },
  { slug: "wigc-bowling-sponsors-sapphire", label: "Bowling Sapphire Sponsors" },
  { slug: "wigc-bowling-sponsors-opal", label: "Bowling Opal Sponsors" },
  { slug: "wigc-bowling-sponsors-jade", label: "Bowling Jade Sponsors" },
];

export const SPONSOR_TYPES = ["casinos", "tribal_offices", "associate_members"];

export const EVENT_CPT_SLUG = "wigc-event";
export const EVENT_TYPES = {
  sessions: "session",
  socials: "social",
};
