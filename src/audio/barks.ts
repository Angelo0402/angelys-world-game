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
