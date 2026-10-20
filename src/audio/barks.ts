import { Audio } from "./AudioManager";
import type { SfxName } from "./manifest";

/**
 * Angely's gameplay barks — short voice lines tied to gameplay moments.
 *
 * Anti-repetition rules (Angelo's requirement, 2026-10-20):
 *  - a global cooldown between any two barks, so she never barks twice
 *    in quick succession;
 *  - never the same clip twice in a row (pools exclude the last clip);
 *  - frequent events (jump, swing) are probability-gated;
 *  - a bark never talks over a dialogue/subtitle voice line
 *    (Audio.voiceBusy) and never cuts one off mid-line.
 *
 * Deterministic story moments (level start, Star Shield, celebrate,
 * game over) pass `force` to skip the cooldown/probability gates —
 * the voiceBusy guard still applies.
 */
const COOLDOWN_MS = 3000;

/** Angely's line when a level of each chapter starts (chapter id → clip). */
export const ENTRY_BARKS: Record<number, SfxName> = {
  1: "bark_entry_forest",
  2: "bark_entry_ruins",
  3: "bark_entry_volcano",
  4: "bark_entry_frozen",
  5: "bark_entry_castle",
  6: "bark_entry_sky",
  7: "bark_entry_temple",
  8: "bark_entry_desert",
  9: "bark_entry_squish",
  10: "bark_entry_veil",
  11: "bark_entry_final",
};

let lastAt = -Infinity;
let lastClip: SfxName | undefined;

export const Barks = {
  /** Call when a level (re)starts so cooldown state matches the new scene clock. */
  reset() {
    lastAt = -Infinity;
    lastClip = undefined;
  },

  play(scene: Phaser.Scene, pool: SfxName[], chance = 1, force = false) {
    if (Audio.voiceBusy()) return;
    const now = scene.time.now;
    if (!force) {
      if (now - lastAt < COOLDOWN_MS) return;
      if (chance < 1 && Math.random() > chance) return;
    }
    const options = pool.filter((c) => c !== lastClip);
    const clip = options.length ? options[Math.floor(Math.random() * options.length)] : pool[0];
    lastAt = now;
    lastClip = clip;
    Audio.playVoice(clip);
  },
};
