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

/** First-sight reaction per enemy type key (fires once per type per level). */
export const SIGHT_BARKS: Record<string, SfxName> = {
  mushroom: "bark_sight_mushroom",
  beetle: "bark_sight_beetle",
  leafimp: "bark_sight_leafimp",
  firefly: "bark_sight_firefly",
  golem: "bark_sight_golem",
  ghost: "bark_sight_ghost",
  lantern: "bark_sight_lantern",
  skeleton: "bark_sight_skeleton",
  firebat: "bark_sight_firebat",
  lavablob: "bark_sight_lavablob",
  crab: "bark_sight_crab",
  magmagolem: "bark_sight_magmagolem",
  frostwolf: "bark_sight_frostwolf",
  icewisp: "bark_sight_icewisp",
  penguin: "bark_sight_penguin",
  yeti: "bark_sight_yeti",
  stormbird: "bark_sight_stormbird",
  thunderimp: "bark_sight_thunderimp",
  jellyfish: "bark_sight_jellyfish",
  cogmoth: "bark_sight_cogmoth",
  gearcrab: "bark_sight_gearcrab",
  blob: "bark_sight_blob",
  toxic: "bark_sight_toxic",
  sandwisp: "bark_sight_sandwisp",
  anglerfish: "bark_sight_anglerfish",
  shardknight: "bark_sight_shardknight",
  voidwraith: "bark_sight_voidwraith",
  galaxmaw: "bark_sight_galaxmaw",
  stormgolem: "bark_sight_stormgolem",
  squish: "bark_sq_sight",
};

/** Hurt reaction per enemy type key (contact, reach attacks and projectiles). */
export const HURT_BARKS: Record<string, SfxName> = {
  squish: "bark_sq_hurt",
  blob: "bark_sq_green",
  toxic: "bark_sq_green",
  mushroom: "bark_hurt_mushroom",
  ghost: "bark_hurt_ghost",
  firebat: "bark_hurt_firebat",
  frostwolf: "bark_hurt_frostwolf",
  yeti: "bark_hurt_yeti",
  jellyfish: "bark_hurt_jellyfish",
  gearcrab: "bark_hurt_gearcrab",
  shardknight: "bark_hurt_shardknight",
  penguin: "bark_hurt_penguin",
  skeleton: "bark_hurt_skeleton",
};

/** Stomp reaction per enemy type key, grouped by family feel. */
export const STOMP_BARKS: Record<string, SfxName> = {
  golem: "bark_stomp_big",
  magmagolem: "bark_stomp_big",
  yeti: "bark_stomp_big",
  stormgolem: "bark_stomp_big",
  firefly: "bark_stomp_fly",
  firebat: "bark_stomp_fly",
  stormbird: "bark_stomp_fly",
  cogmoth: "bark_stomp_fly",
  lantern: "bark_stomp_fly",
  icewisp: "bark_stomp_fly",
  thunderimp: "bark_stomp_fly",
  jellyfish: "bark_stomp_fly",
  anglerfish: "bark_stomp_fly",
  galaxmaw: "bark_stomp_fly",
  sandwisp: "bark_stomp_fly",
  crab: "bark_stomp_crab",
  gearcrab: "bark_stomp_crab",
  ghost: "bark_stomp_spooky",
  skeleton: "bark_stomp_spooky",
  voidwraith: "bark_stomp_spooky",
  lavablob: "bark_stomp_goo",
  blob: "bark_stomp_goo",
  toxic: "bark_stomp_goo",
  shardknight: "bark_stomp_knight",
  mushroom: "bark_stomp_small",
  beetle: "bark_stomp_small",
  leafimp: "bark_stomp_small",
  frostwolf: "bark_stomp_small",
  penguin: "bark_stomp_small",
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
