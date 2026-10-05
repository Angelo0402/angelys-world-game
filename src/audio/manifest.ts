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
  | "portal_open"
  | "magic_spell"
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
  | "wand_cast";

/**
 * Real audio files override the synth placeholders. Drop a file into
 * public/assets/audio/ and add its name here, e.g. `jump: "jump.mp3"`.
 */
export const AUDIO_FILES: Partial<Record<SfxName | MusicTrack, string>> = {
  portal_open: "portal_open.mp3",
  portal_enter: "portal_enter.mp3",
  magic_spell: "magic_spell.mp3",
};
