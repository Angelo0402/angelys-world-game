import type { MusicTrack } from "../config";

export type SfxName =
  | "jump"
  | "sword_swing"
  | "sword_pickup"
  | "sword_hit"
  | "sword_clink"
  | "enemy_hit"
  | "enemy_defeat"
  | "enemy_telegraph"
  | "stomp"
  | "puff_attack"
  | "bat_dive"
  | "ghost_orb"
  | "lantern_bolt"
  | "skeleton_swing"
  | "fire_spit"
  | "fire_impact"
  | "lava_burst"
  | "ground_slam"
  | "player_hurt"
  | "heart_pickup"
  | "checkpoint"
  | "portal_unlock"
  | "portal_enter"
  | "fall"
  | "chapter_transition"
  | "button"
  | "low_health"
  | "player_defeat"
  | "bow_shoot"
  | "arrow_hit"
  | "hammer_swing"
  | "hammer_smash"
  | "wall_break"
  | "crate_push"
  | "spring"
  | "crumble"
  | "target_hit"
  | "bridge_rise"
  | "weapon_swap"
  | "weapon_pickup"
  | "boss_roar"
  | "boss_cast"
  | "boss_hit"
  | "boss_swoop"
  | "boss_defeat"
  | "voice_umbra"
  | "voice_angely"
  | "voice_angelo"
  | "gem"
  | "swim"
  | "boomerang"
  | "cog"
  | "ray"
  | "wand_charge"
  | "wand_cast"
  // Voice acting clips (ElevenLabs). Register each file in AUDIO_FILES below
  // once the MP3 exists in public/assets/audio/.
  | "angely_01" | "angely_02" | "angely_03" | "angely_04" | "angely_05"
  | "angely_06" | "angely_07" | "angely_08" | "angely_09" | "angely_10"
  | "angely_11" | "angely_12" | "angely_13" | "angely_14" | "angely_15"
  | "angely_16" | "angely_17" | "angely_18" | "angely_19" | "angely_20"
  | "angely_21" | "angely_22" | "angely_23" | "angely_24" | "angely_25"
  | "angely_26" | "angely_27" | "angely_28" | "angely_29" | "angely_30"
  | "angely_31" | "angely_32"
  | "angely_bark_01" | "angely_bark_02" | "angely_bark_03" | "angely_bark_04"
  | "angely_bark_05" | "angely_bark_06" | "angely_bark_07" | "angely_bark_08"
  | "angely_bark_09" | "angely_bark_10" | "angely_bark_11"
  | "bark_entry_forest" | "bark_entry_ruins" | "bark_entry_volcano" | "bark_entry_frozen"
  | "bark_entry_castle" | "bark_entry_sky" | "bark_entry_temple" | "bark_entry_desert"
  | "bark_entry_squish" | "bark_entry_veil" | "bark_entry_final"
  | "bark_sq_sight" | "bark_sq_stomp" | "bark_sq_hurt" | "bark_sq_green" | "bark_sq_bounce"
  | "bark_rx_lowhp" | "bark_rx_fall" | "bark_rx_checkpoint" | "bark_rx_weapon"
  | "bark_rx_boss" | "bark_rx_gems" | "bark_rx_enemies"
  | "bark_sight_mushroom"
  | "bark_sight_beetle"
  | "bark_sight_leafimp"
  | "bark_sight_firefly"
  | "bark_sight_golem"
  | "bark_sight_ghost"
  | "bark_sight_lantern"
  | "bark_sight_skeleton"
  | "bark_sight_firebat"
  | "bark_sight_lavablob"
  | "bark_sight_crab"
  | "bark_sight_magmagolem"
  | "bark_sight_frostwolf"
  | "bark_sight_icewisp"
  | "bark_sight_penguin"
  | "bark_sight_yeti"
  | "bark_sight_stormbird"
  | "bark_sight_thunderimp"
  | "bark_sight_jellyfish"
  | "bark_sight_cogmoth"
  | "bark_sight_gearcrab"
  | "bark_sight_blob"
  | "bark_sight_toxic"
  | "bark_sight_sandwisp"
  | "bark_sight_anglerfish"
  | "bark_sight_shardknight"
  | "bark_sight_voidwraith"
  | "bark_sight_galaxmaw"
  | "bark_sight_stormgolem"
  | "bark_hurt_mushroom"
  | "bark_hurt_ghost"
  | "bark_hurt_firebat"
  | "bark_hurt_frostwolf"
  | "bark_hurt_yeti"
  | "bark_hurt_jellyfish"
  | "bark_hurt_gearcrab"
  | "bark_hurt_shardknight"
  | "bark_hurt_penguin"
  | "bark_hurt_skeleton"
  | "bark_stomp_big"
  | "bark_stomp_fly"
  | "bark_stomp_crab"
  | "bark_stomp_spooky"
  | "bark_stomp_goo"
  | "bark_stomp_knight"
  | "bark_stomp_small"
  | "umbra_01" | "umbra_02" | "umbra_03" | "umbra_04" | "umbra_05"
  | "umbra_06" | "umbra_07" | "umbra_08" | "umbra_09" | "umbra_10"
  | "angelo_01" | "angelo_02" | "angelo_03" | "angelo_04" | "angelo_05"
  | "angelo_06" | "angelo_07" | "angelo_08" | "angelo_09" | "angelo_10"
  | "angelo_11" | "angelo_12" | "angelo_13" | "angelo_14" | "angelo_15"
  | "angelo_16" | "angelo_17" | "angelo_18" | "angelo_19" | "angelo_20"
  | "angelo_21"
  // Crystal Veil scene voices (ElevenLabs, generated 2026-10-20).
  // NOTE: angelo_01-07 / angely_01-07 files are the Colossus finale
  // recordings — do NOT wire them to Veil lines.
  | "veil_angelo_01" | "veil_angelo_02" | "veil_angelo_03" | "veil_angelo_04"
  | "veil_angelo_05" | "veil_angelo_06" | "veil_angelo_07"
  | "veil_angely_01" | "veil_angely_02" | "veil_angely_03" | "veil_angely_04"
  | "veil_angely_05" | "veil_angely_06" | "veil_angely_07"
  | "sovereign_01" | "sovereign_02" | "sovereign_03" | "sovereign_04";

/**
 * Real audio files override the synth placeholders. Drop a file into
 * public/assets/audio/ and add its name here, e.g. `jump: "jump.mp3"`.
 *
 * VOICE CLIPS: uncomment a line once its MP3 exists in public/assets/audio/.
 * (Queued for preload by src/assets/manifest.ts; missing files are skipped
 * gracefully and the synth blip plays instead.)
 */
export const AUDIO_FILES: Partial<Record<SfxName | MusicTrack, string>> = {
  angely_01: "angely_01.mp3",
  angely_02: "angely_02.mp3",
  angely_03: "angely_03.mp3",
  angely_04: "angely_04.mp3",
  angely_05: "angely_05.mp3",
  angely_06: "angely_06.mp3",
  angely_07: "angely_07.mp3",
  angely_08: "angely_08.mp3",
  angely_09: "angely_09.mp3",
  angely_10: "angely_10.mp3",
  angely_11: "angely_11.mp3",
  angely_12: "angely_12.mp3",
  angely_13: "angely_13.mp3",
  angely_14: "angely_14.mp3",
  angely_15: "angely_15.mp3",
  angely_16: "angely_16.mp3",
  angely_17: "angely_17.mp3",
  angely_18: "angely_18.mp3",
  angely_19: "angely_19.mp3",
  angely_20: "angely_20.mp3",
  angely_21: "angely_21.mp3",
  angely_22: "angely_22.mp3",
  angely_23: "angely_23.mp3",
  angely_24: "angely_24.mp3",
  angely_25: "angely_25.mp3",
  angely_26: "angely_26.mp3",
  angely_27: "angely_27.mp3",
  angely_28: "angely_28.mp3",
  angely_29: "angely_29.mp3",
  angely_30: "angely_30.mp3",
  angely_31: "angely_31.mp3",
  angely_32: "angely_32.mp3",
  angely_bark_01: "angely_bark_01.mp3",
  angely_bark_02: "angely_bark_02.mp3",
  angely_bark_03: "angely_bark_03.mp3",
  angely_bark_04: "angely_bark_04.mp3",
  angely_bark_05: "angely_bark_05.mp3",
  angely_bark_06: "angely_bark_06.mp3",
  angely_bark_07: "angely_bark_07.mp3",
  angely_bark_08: "angely_bark_08.mp3",
  angely_bark_09: "angely_bark_09.mp3",
  angely_bark_10: "angely_bark_10.mp3",
  angely_bark_11: "angely_bark_11.mp3",
  bark_entry_forest: "bark_entry_forest.mp3",
  bark_entry_ruins: "bark_entry_ruins.mp3",
  bark_entry_volcano: "bark_entry_volcano.mp3",
  bark_entry_frozen: "bark_entry_frozen.mp3",
  bark_entry_castle: "bark_entry_castle.mp3",
  bark_entry_sky: "bark_entry_sky.mp3",
  bark_entry_temple: "bark_entry_temple.mp3",
  bark_entry_desert: "bark_entry_desert.mp3",
  bark_entry_squish: "bark_entry_squish.mp3",
  bark_entry_veil: "bark_entry_veil.mp3",
  bark_entry_final: "bark_entry_final.mp3",
  bark_sq_sight: "bark_sq_sight.mp3",
  bark_sq_stomp: "bark_sq_stomp.mp3",
  bark_sq_hurt: "bark_sq_hurt.mp3",
  bark_sq_green: "bark_sq_green.mp3",
  bark_sq_bounce: "bark_sq_bounce.mp3",
  bark_rx_lowhp: "bark_rx_lowhp.mp3",
  bark_rx_fall: "bark_rx_fall.mp3",
  bark_rx_checkpoint: "bark_rx_checkpoint.mp3",
  bark_rx_weapon: "bark_rx_weapon.mp3",
  bark_rx_boss: "bark_rx_boss.mp3",
  bark_rx_gems: "bark_rx_gems.mp3",
  bark_rx_enemies: "bark_rx_enemies.mp3",
  bark_sight_mushroom: "bark_sight_mushroom.mp3",
  bark_sight_beetle: "bark_sight_beetle.mp3",
  bark_sight_leafimp: "bark_sight_leafimp.mp3",
  bark_sight_firefly: "bark_sight_firefly.mp3",
  bark_sight_golem: "bark_sight_golem.mp3",
  bark_sight_ghost: "bark_sight_ghost.mp3",
  bark_sight_lantern: "bark_sight_lantern.mp3",
  bark_sight_skeleton: "bark_sight_skeleton.mp3",
  bark_sight_firebat: "bark_sight_firebat.mp3",
  bark_sight_lavablob: "bark_sight_lavablob.mp3",
  bark_sight_crab: "bark_sight_crab.mp3",
  bark_sight_magmagolem: "bark_sight_magmagolem.mp3",
  bark_sight_frostwolf: "bark_sight_frostwolf.mp3",
  bark_sight_icewisp: "bark_sight_icewisp.mp3",
  bark_sight_penguin: "bark_sight_penguin.mp3",
  bark_sight_yeti: "bark_sight_yeti.mp3",
  bark_sight_stormbird: "bark_sight_stormbird.mp3",
  bark_sight_thunderimp: "bark_sight_thunderimp.mp3",
  bark_sight_jellyfish: "bark_sight_jellyfish.mp3",
  bark_sight_cogmoth: "bark_sight_cogmoth.mp3",
  bark_sight_gearcrab: "bark_sight_gearcrab.mp3",
  bark_sight_blob: "bark_sight_blob.mp3",
  bark_sight_toxic: "bark_sight_toxic.mp3",
  bark_sight_sandwisp: "bark_sight_sandwisp.mp3",
  bark_sight_anglerfish: "bark_sight_anglerfish.mp3",
  bark_sight_shardknight: "bark_sight_shardknight.mp3",
  bark_sight_voidwraith: "bark_sight_voidwraith.mp3",
  bark_sight_galaxmaw: "bark_sight_galaxmaw.mp3",
  bark_sight_stormgolem: "bark_sight_stormgolem.mp3",
  bark_hurt_mushroom: "bark_hurt_mushroom.mp3",
  bark_hurt_ghost: "bark_hurt_ghost.mp3",
  bark_hurt_firebat: "bark_hurt_firebat.mp3",
  bark_hurt_frostwolf: "bark_hurt_frostwolf.mp3",
  bark_hurt_yeti: "bark_hurt_yeti.mp3",
  bark_hurt_jellyfish: "bark_hurt_jellyfish.mp3",
  bark_hurt_gearcrab: "bark_hurt_gearcrab.mp3",
  bark_hurt_shardknight: "bark_hurt_shardknight.mp3",
  bark_hurt_penguin: "bark_hurt_penguin.mp3",
  bark_hurt_skeleton: "bark_hurt_skeleton.mp3",
  bark_stomp_big: "bark_stomp_big.mp3",
  bark_stomp_fly: "bark_stomp_fly.mp3",
  bark_stomp_crab: "bark_stomp_crab.mp3",
  bark_stomp_spooky: "bark_stomp_spooky.mp3",
  bark_stomp_goo: "bark_stomp_goo.mp3",
  bark_stomp_knight: "bark_stomp_knight.mp3",
  bark_stomp_small: "bark_stomp_small.mp3",
  umbra_01: "umbra_01.mp3",
  umbra_02: "umbra_02.mp3",
  umbra_03: "umbra_03.mp3",
  umbra_04: "umbra_04.mp3",
  umbra_05: "umbra_05.mp3",
  umbra_06: "umbra_06.mp3",
  umbra_07: "umbra_07.mp3",
  umbra_08: "umbra_08.mp3",
  umbra_09: "umbra_09.mp3",
  umbra_10: "umbra_10.mp3",
  angelo_01: "angelo_01.mp3",
  angelo_02: "angelo_02.mp3",
  angelo_03: "angelo_03.mp3",
  angelo_04: "angelo_04.mp3",
  angelo_05: "angelo_05.mp3",
  angelo_06: "angelo_06.mp3",
  angelo_07: "angelo_07.mp3",
  angelo_08: "angelo_08.mp3",
  angelo_09: "angelo_09.mp3",
  angelo_10: "angelo_10.mp3",
  angelo_11: "angelo_11.mp3",
  angelo_12: "angelo_12.mp3",
  angelo_13: "angelo_13.mp3",
  angelo_14: "angelo_14.mp3",
  angelo_15: "angelo_15.mp3",
  angelo_16: "angelo_16.mp3",
  angelo_17: "angelo_17.mp3",
  angelo_18: "angelo_18.mp3",
  angelo_19: "angelo_19.mp3",
  angelo_20: "angelo_20.mp3",
  angelo_21: "angelo_21.mp3",
  veil_angelo_01: "veil_angelo_01.mp3",
  veil_angelo_02: "veil_angelo_02.mp3",
  veil_angelo_03: "veil_angelo_03.mp3",
  veil_angelo_04: "veil_angelo_04.mp3",
  veil_angelo_05: "veil_angelo_05.mp3",
  veil_angelo_06: "veil_angelo_06.mp3",
  veil_angelo_07: "veil_angelo_07.mp3",
  veil_angely_01: "veil_angely_01.mp3",
  veil_angely_02: "veil_angely_02.mp3",
  veil_angely_03: "veil_angely_03.mp3",
  veil_angely_04: "veil_angely_04.mp3",
  veil_angely_05: "veil_angely_05.mp3",
  veil_angely_06: "veil_angely_06.mp3",
  veil_angely_07: "veil_angely_07.mp3",
  sovereign_01: "sovereign_01.mp3",
  sovereign_02: "sovereign_02.mp3",
  sovereign_03: "sovereign_03.mp3",
  sovereign_04: "sovereign_04.mp3",
};
