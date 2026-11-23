/**
 * Design system — TEST branch (design-test, PRUEBA, 2026-11-23).
 * Tokens sampled from the web design test (artifact angely-s-world-design-test):
 * deep violet-navy surfaces (the Crystal Veil world, never pure black),
 * warm cream, ONE accent = Angely's bow pink, gold only for coin details.
 * Fonts: Fontshare Chillax (display) + Satoshi (UI), bundled as woff2 in
 * public/assets/fonts so the APK works offline. If a font fails to load,
 * the stacks fall back to the old system fonts — the game never blocks.
 * Motion: one easing with character (EASE_POP, the test's
 * cubic-bezier(.33, 1.4, .44, 1) overshoot); new decorative tweens are
 * gated on REDUCED_MOTION. Gameplay/feedback motion is untouched.
 */

export const DESIGN = {
  veilDeep: 0x0e0a24,
  veil: 0x171233,
  veilPanel: 0x251c4f,
  veilLine: 0x3a2c74,
  ink: 0x1e1844,
  cream: 0xf6edd8,
  paper: 0xffffff,
  sand: 0xd9cca9,
  bow: 0xf4537f,
  bowDeep: 0xc23359,
  gold: 0xf0b23e,
  goldDeep: 0xb97f1e,
  on: 0x43b968,
  off: 0xde4a3c,
} as const;

/** Same tokens as CSS hex strings, for canvas fills and text colors. */
export const DESIGN_CSS = {
  veilDeep: "#0E0A24",
  veil: "#171233",
  veilPanel: "#251C4F",
  veilLine: "#3A2C74",
  ink: "#1E1844",
  cream: "#F6EDD8",
  paper: "#FFFFFF",
  sand: "#D9CCA9",
  bow: "#F4537F",
  bowDeep: "#C23359",
  gold: "#F0B23E",
  goldDeep: "#B97F1E",
  on: "#43B968",
  off: "#DE4A3C",
} as const;

/** Titles, big buttons, chapter names. */
export const FONT_DISPLAY = '"Chillax", "Satoshi", "Trebuchet MS", sans-serif';
/** All other UI text (labels, counters, dialogue). */
export const FONT_UI = '"Satoshi", "Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** The test page's single easing (cubic-bezier(.33, 1.4, .44, 1)) as a Phaser ease. */
export const EASE_POP = "Back.out";

/** True when the device asks for reduced motion — new decorative tweens skip. */
export const REDUCED_MOTION =
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
