import type { SpriteKey } from "../assets/sprites.gen";
import type { SfxName } from "../audio/manifest";

export type AttackKind = "melee" | "lunge" | "roll" | "dive" | "shoot" | "slam" | "lava";
export type ProjectileSheet = "fx_orb" | "fx_bolt" | "fx_fireball" | "fx_dust";

/** Projectile sheets that the sword can parry/reflect. fx_dust is a visual-only effect. */
export const REFLECTABLE_PROJECTILES: ReadonlySet<ProjectileSheet> = new Set(["fx_orb", "fx_bolt", "fx_fireball"]);

/** Faction of a projectile: "enemy" harms the player, "player" harms enemies. */
export type ProjectileFaction = "enemy" | "player";

export interface EnemyType {
  key: SpriteKey;
  /** On-screen height of the idle pose in game pixels. */
  height: number;
  hp: number;
  speed: number;
  flying?: boolean;
  attack: AttackKind;
  range: number;
  cooldown: number;
  windup: number;
  projectile?: { sheet: ProjectileSheet; speed: number; aimed: boolean; tint?: number; scale: number };
  armoredFront?: boolean;
  heartDrop?: number;
  attackSfx: SfxName;
  /** Body size as a fraction of display width/height. */
  body: [number, number];
  keepDistance?: number;
}

export const ENEMY_TYPES: Record<string, EnemyType> = {
  // Chapter 1: The Enchanted Forest
  mushroom: {
    key: "mushroom", height: 59, hp: 1, speed: 55, attack: "shoot", range: 330, cooldown: 2600, windup: 520,
    projectile: { sheet: "fx_dust", speed: 170, aimed: false, tint: 0xc9ff9a, scale: 0.32 },
    attackSfx: "puff_attack", body: [0.5, 0.8], keepDistance: 140,
  },
  beetle: {
    key: "beetle", height: 52, hp: 2, speed: 65, attack: "roll", range: 340, cooldown: 2800, windup: 600,
    attackSfx: "bat_dive", body: [0.55, 0.75],
  },
  leafimp: {
    key: "leafimp", height: 67, hp: 1, speed: 88, attack: "lunge", range: 120, cooldown: 1800, windup: 420,
    attackSfx: "skeleton_swing", body: [0.42, 0.85],
  },
  firefly: {
    key: "firefly", height: 48, hp: 1, speed: 105, flying: true, attack: "dive", range: 260, cooldown: 2600, windup: 520,
    attackSfx: "bat_dive", body: [0.55, 0.6],
  },
  // Chapter 2: Moonlit Ruins
  golem: {
    key: "golem", height: 83, hp: 3, speed: 42, attack: "slam", range: 150, cooldown: 2600, windup: 750,
    attackSfx: "ground_slam", body: [0.5, 0.85], heartDrop: 0.3,
  },
  ghost: {
    key: "ghost", height: 65, hp: 2, speed: 70, flying: true, attack: "shoot", range: 460, cooldown: 2400, windup: 560,
    projectile: { sheet: "fx_orb", speed: 250, aimed: true, scale: 0.34 },
    attackSfx: "ghost_orb", body: [0.5, 0.6], keepDistance: 240,
  },
  lantern: {
    key: "lantern", height: 67, hp: 2, speed: 78, flying: true, attack: "shoot", range: 480, cooldown: 2200, windup: 520,
    projectile: { sheet: "fx_bolt", speed: 360, aimed: true, scale: 0.34 },
    attackSfx: "lantern_bolt", body: [0.5, 0.6], keepDistance: 280,
  },
  skeleton: {
    key: "skeleton", height: 76, hp: 2, speed: 82, attack: "lunge", range: 125, cooldown: 1700, windup: 430,
    attackSfx: "skeleton_swing", body: [0.42, 0.85],
  },
  // Chapter 3: Volcanic Caves
  firebat: {
    key: "firebat", height: 51, hp: 1, speed: 110, flying: true, attack: "shoot", range: 460, cooldown: 2000, windup: 480,
    projectile: { sheet: "fx_fireball", speed: 300, aimed: true, scale: 0.34 },
    attackSfx: "fire_spit", body: [0.5, 0.6], keepDistance: 230,
  },
  lavablob: {
    key: "lavablob", height: 43, hp: 2, speed: 50, attack: "lava", range: 220, cooldown: 3200, windup: 600,
    attackSfx: "lava_burst", body: [0.55, 0.75],
  },
  crab: {
    key: "crab", height: 56, hp: 3, speed: 80, attack: "melee", range: 115, cooldown: 1600, windup: 450, armoredFront: true,
    attackSfx: "skeleton_swing", body: [0.55, 0.75], heartDrop: 0.25,
  },
  magmagolem: {
    key: "magmagolem", height: 89, hp: 4, speed: 44, attack: "slam", range: 150, cooldown: 2500, windup: 780,
    attackSfx: "ground_slam", body: [0.5, 0.85], heartDrop: 0.35,
  },
  // Chapter 4: Frozen Peaks
  frostwolf: {
    key: "frostwolf", height: 57, hp: 2, speed: 96, attack: "lunge", range: 135, cooldown: 1600, windup: 400,
    attackSfx: "skeleton_swing", body: [0.55, 0.75],
  },
  icewisp: {
    key: "icewisp", height: 52, hp: 2, speed: 85, flying: true, attack: "shoot", range: 470, cooldown: 2100, windup: 500,
    projectile: { sheet: "fx_orb", speed: 330, aimed: true, tint: 0xa8f0ff, scale: 0.34 },
    attackSfx: "lantern_bolt", body: [0.5, 0.6], keepDistance: 250,
  },
  penguin: {
    key: "penguin", height: 56, hp: 2, speed: 70, attack: "roll", range: 360, cooldown: 2500, windup: 550,
    attackSfx: "bat_dive", body: [0.55, 0.8],
  },
  yeti: {
    key: "yeti", height: 92, hp: 4, speed: 46, attack: "slam", range: 155, cooldown: 2400, windup: 760,
    attackSfx: "ground_slam", body: [0.5, 0.85], heartDrop: 0.35,
  },
  // Chapter 6: The Sky Tower (30-frame sheets)
  stormbird: {
    key: "stormbird", height: 56, hp: 2, speed: 120, flying: true, attack: "dive", range: 300, cooldown: 2300, windup: 480,
    attackSfx: "bat_dive", body: [0.55, 0.6],
  },
  thunderimp: {
    key: "thunderimp", height: 54, hp: 2, speed: 80, flying: true, attack: "shoot", range: 480, cooldown: 2300, windup: 620,
    projectile: { sheet: "fx_bolt", speed: 380, aimed: true, tint: 0xfff27a, scale: 0.36 },
    attackSfx: "lantern_bolt", body: [0.55, 0.6], keepDistance: 260, heartDrop: 0.2,
  },
  // Chapter 7: The Sunken Temple
  jellyfish: {
    key: "jellyfish", height: 64, hp: 2, speed: 55, flying: true, attack: "melee", range: 120, cooldown: 1900, windup: 520,
    attackSfx: "lantern_bolt", body: [0.5, 0.55],
  },
  // Chapter 8: The Clockwork Desert
  cogmoth: {
    key: "cogmoth", height: 54, hp: 1, speed: 115, flying: true, attack: "dive", range: 280, cooldown: 2200, windup: 460,
    attackSfx: "bat_dive", body: [0.55, 0.55],
  },
  gearcrab: {
    key: "gearcrab", height: 57, hp: 3, speed: 70, attack: "melee", range: 120, cooldown: 1600, windup: 440, armoredFront: true,
    attackSfx: "skeleton_swing", body: [0.55, 0.75], heartDrop: 0.25,
  },
  // Chapter 9: Squishy Valley
  blob: {
    key: "blob", height: 54, hp: 1, speed: 62, attack: "shoot", range: 340, cooldown: 2200, windup: 480,
    projectile: { sheet: "fx_orb", speed: 240, aimed: true, tint: 0xb6ff6a, scale: 0.32 },
    attackSfx: "puff_attack", body: [0.55, 0.7], keepDistance: 150,
  },
  squish: {
    key: "squish", height: 60, hp: 2, speed: 88, attack: "lunge", range: 130, cooldown: 1600, windup: 380,
    attackSfx: "bat_dive", body: [0.55, 0.75],
  },
  toxic: {
    key: "toxic", height: 57, hp: 3, speed: 54, attack: "shoot", range: 400, cooldown: 2000, windup: 520,
    projectile: { sheet: "fx_orb", speed: 300, aimed: true, tint: 0x7dff4a, scale: 0.36 },
    attackSfx: "fire_spit", body: [0.6, 0.7], keepDistance: 180, heartDrop: 0.2,
  },
  sandwisp: {
    key: "sandwisp", height: 59, hp: 2, speed: 78, flying: true, attack: "shoot", range: 460, cooldown: 2100, windup: 540,
    projectile: { sheet: "fx_dust", speed: 280, aimed: true, tint: 0xffd27a, scale: 0.36 },
    attackSfx: "puff_attack", body: [0.5, 0.6], keepDistance: 240, heartDrop: 0.2,
  },
  anglerfish: {
    key: "anglerfish", height: 56, hp: 2, speed: 75, flying: true, attack: "shoot", range: 460, cooldown: 2200, windup: 560,
    projectile: { sheet: "fx_orb", speed: 280, aimed: true, tint: 0xfff27a, scale: 0.36 },
    attackSfx: "ghost_orb", body: [0.55, 0.55], keepDistance: 240, heartDrop: 0.2,
  },
  // Angelo's new enemies (2026-10-04)
  gargoyle: {
    key: "gargoyle", height: 88, hp: 3, speed: 60, attack: "shoot", range: 380, cooldown: 2400, windup: 600,
    projectile: { sheet: "fx_orb", speed: 260, aimed: true, tint: 0xb366ff, scale: 0.4 },
    attackSfx: "ghost_orb", body: [0.5, 0.8], keepDistance: 160, heartDrop: 0.15,
  },
  pufferfish: {
    key: "pufferfish", height: 72, hp: 2, speed: 70, flying: true, attack: "shoot", range: 400, cooldown: 2000, windup: 500,
    projectile: { sheet: "fx_orb", speed: 240, aimed: true, tint: 0x7ad4ff, scale: 0.36 },
    attackSfx: "puff_attack", body: [0.55, 0.6], keepDistance: 200, heartDrop: 0.15,
  },
  lavalizard: {
    key: "lavalizard", height: 80, hp: 3, speed: 75, attack: "shoot", range: 350, cooldown: 2200, windup: 550,
    projectile: { sheet: "fx_fireball", speed: 280, aimed: true, tint: 0xff6a2a, scale: 0.4 },
    attackSfx: "fire_spit", body: [0.55, 0.75], keepDistance: 150, heartDrop: 0.15,
  },
  acorn: {
    key: "acorn", height: 68, hp: 2, speed: 85, attack: "lunge", range: 130, cooldown: 1700, windup: 400,
    attackSfx: "bat_dive", body: [0.5, 0.8], heartDrop: 0.15,
  },
  forest_slime: {
    key: "forest_slime", height: 56, hp: 2, speed: 60, attack: "shoot", range: 380, cooldown: 2200, windup: 500,
    projectile: { sheet: "fx_orb", speed: 220, aimed: true, scale: 0.34 },
    attackSfx: "fire_spit", body: [0.55, 0.7], heartDrop: 0.15,
  },
  crystal_spider: {
    key: "crystal_spider", height: 54, hp: 2, speed: 95, attack: "shoot", range: 420, cooldown: 2000, windup: 480,
    projectile: { sheet: "fx_bolt", speed: 280, aimed: true, scale: 0.34 },
    attackSfx: "fire_spit", body: [0.55, 0.65], heartDrop: 0.15,
  },
  gem_golem: {
    key: "gem_golem", height: 68, hp: 4, speed: 45, attack: "lunge", range: 140, cooldown: 2000, windup: 600,
    attackSfx: "skeleton_swing", body: [0.5, 0.8], heartDrop: 0.2,
  },
  swamp_crawler: {
    key: "swamp_crawler", height: 52, hp: 2, speed: 70, attack: "lunge", range: 130, cooldown: 1800, windup: 450,
    attackSfx: "bat_dive", body: [0.55, 0.7], heartDrop: 0.15,
  },
  bog_witch: {
    key: "bog_witch", height: 60, hp: 2, speed: 55, flying: true, attack: "shoot", range: 420, cooldown: 2200, windup: 550,
    projectile: { sheet: "fx_orb", speed: 240, aimed: true, scale: 0.34 },
    attackSfx: "ghost_orb", body: [0.5, 0.65], keepDistance: 250, heartDrop: 0.15,
  },
  jungle_tiger: {
    key: "jungle_tiger", height: 56, hp: 3, speed: 85, attack: "lunge", range: 140, cooldown: 1800, windup: 500,
    attackSfx: "bat_dive", body: [0.5, 0.7], heartDrop: 0.15,
  },
  vine_serpent: {
    key: "vine_serpent", height: 52, hp: 2, speed: 90, attack: "lunge", range: 130, cooldown: 1700, windup: 450,
    attackSfx: "bat_dive", body: [0.5, 0.7], heartDrop: 0.15,
  },
  storm_roc: {
    key: "storm_roc", height: 52, hp: 2, speed: 110, attack: "dive", range: 200, cooldown: 2000, windup: 600,
    attackSfx: "bat_dive", body: [0.5, 0.7], heartDrop: 0.15,
  },
  thunder_golem: {
    key: "thunder_golem", height: 68, hp: 4, speed: 50, attack: "slam", range: 150, cooldown: 2200, windup: 700,
    attackSfx: "skeleton_swing", body: [0.5, 0.7], heartDrop: 0.15,
  },
  ghost_knight: {
    key: "ghost_knight", height: 60, hp: 3, speed: 70, attack: "lunge", range: 140, cooldown: 1900, windup: 550,
    attackSfx: "ghost_orb", body: [0.5, 0.7], heartDrop: 0.15,
  },
  zombie_hound: {
    key: "zombie_hound", height: 48, hp: 2, speed: 95, attack: "lunge", range: 120, cooldown: 1600, windup: 400,
    attackSfx: "bat_dive", body: [0.5, 0.7], heartDrop: 0.15,
  },
  candy_golem: {
    key: "candy_golem", height: 64, hp: 4, speed: 55, attack: "slam", range: 150, cooldown: 2100, windup: 650,
    attackSfx: "skeleton_swing", body: [0.5, 0.7], heartDrop: 0.15,
  },
  licorice_witch: {
    key: "licorice_witch", height: 56, hp: 2, speed: 60, attack: "shoot", range: 400, cooldown: 2200, windup: 550,
    projectile: { sheet: "fx_orb", speed: 240, aimed: true, scale: 0.34 },
    attackSfx: "ghost_orb", body: [0.5, 0.7], heartDrop: 0.15,
  },
  abyss_shark: {
    key: "abyss_shark", height: 60, hp: 3, speed: 100, attack: "lunge", range: 150, cooldown: 1800, windup: 500,
    attackSfx: "bat_dive", body: [0.5, 0.7], heartDrop: 0.15,
  },
  jellyfish_queen: {
    key: "jellyfish_queen", height: 56, hp: 2, speed: 65, attack: "shoot", range: 380, cooldown: 2300, windup: 600,
    projectile: { sheet: "fx_bolt", speed: 240, aimed: true, scale: 0.34 },
    attackSfx: "ghost_orb", body: [0.5, 0.7], heartDrop: 0.15,
  },
  clockwork_soldier: {
    key: "clockwork_soldier", height: 60, hp: 3, speed: 75, attack: "lunge", range: 140, cooldown: 1900, windup: 550,
    attackSfx: "skeleton_swing", body: [0.5, 0.7], heartDrop: 0.15,
  },
  gear_spider: {
    key: "gear_spider", height: 48, hp: 2, speed: 100, attack: "lunge", range: 130, cooldown: 1700, windup: 450,
    attackSfx: "bat_dive", body: [0.5, 0.7], heartDrop: 0.15,
  },
  void_walker: {
    key: "void_walker", height: 60, hp: 3, speed: 80, attack: "lunge", range: 140, cooldown: 2000, windup: 600,
    attackSfx: "ghost_orb", body: [0.5, 0.7], heartDrop: 0.15,
  },
  star_eater: {
    key: "star_eater", height: 68, hp: 4, speed: 60, attack: "slam", range: 160, cooldown: 2200, windup: 700,
    attackSfx: "skeleton_swing", body: [0.5, 0.7], heartDrop: 0.15,
  },
  baby_dragon: {
    key: "baby_dragon", height: 52, hp: 2, speed: 90, attack: "shoot", range: 350, cooldown: 2000, windup: 500,
    projectile: { sheet: "fx_fireball", speed: 240, aimed: true, scale: 0.34 },
    attackSfx: "ghost_orb", body: [0.5, 0.7], heartDrop: 0.15,
  },
  fire_imp: {
    key: "fire_imp", height: 48, hp: 2, speed: 105, attack: "lunge", range: 130, cooldown: 1700, windup: 450,
    attackSfx: "bat_dive", body: [0.5, 0.7], heartDrop: 0.15,
  },
  umbra_guard: {
    key: "umbra_guard", height: 64, hp: 4, speed: 70, attack: "lunge", range: 150, cooldown: 1900, windup: 600,
    attackSfx: "skeleton_swing", body: [0.5, 0.7], heartDrop: 0.15,
  },
  shadow_lord: {
    key: "shadow_lord", height: 72, hp: 5, speed: 65, attack: "shoot", range: 420, cooldown: 2400, windup: 650,
    projectile: { sheet: "fx_bolt", speed: 240, aimed: true, scale: 0.34 },
    attackSfx: "ghost_orb", body: [0.5, 0.7], heartDrop: 0.15,
  },
  // Angelo's pack creatures (2026-10-04) — single-frame enemies
  tempest_eagle: {
    key: "tempest_eagle", height: 88, hp: 2, speed: 90, flying: true, attack: "shoot", range: 420, cooldown: 2100, windup: 500,
    projectile: { sheet: "fx_bolt", speed: 300, aimed: true, scale: 0.4 },
    attackSfx: "bat_dive", body: [0.55, 0.6], keepDistance: 220, heartDrop: 0.15,
  },
  storm_cloud: {
    key: "storm_cloud", height: 104, hp: 3, speed: 50, flying: true, attack: "shoot", range: 380, cooldown: 2400, windup: 600,
    projectile: { sheet: "fx_bolt", speed: 260, aimed: true, scale: 0.45 },
    attackSfx: "ghost_orb", body: [0.6, 0.6], keepDistance: 200, heartDrop: 0.15,
  },
  lava_turtle: {
    key: "lava_turtle", height: 76, hp: 4, speed: 45, attack: "shoot", range: 350, cooldown: 2300, windup: 550,
    projectile: { sheet: "fx_fireball", speed: 260, aimed: true, scale: 0.4 },
    attackSfx: "fire_spit", body: [0.6, 0.75], keepDistance: 160, heartDrop: 0.15,
  },
  lava_wisp: {
    key: "lava_wisp", height: 96, hp: 2, speed: 100, flying: true, attack: "dive", range: 300, cooldown: 1900, windup: 450,
    attackSfx: "bat_dive", body: [0.5, 0.6], heartDrop: 0.15,
  },
  ocean_jelly: {
    key: "ocean_jelly", height: 88, hp: 2, speed: 60, flying: true, attack: "shoot", range: 400, cooldown: 2100, windup: 520,
    projectile: { sheet: "fx_orb", speed: 240, aimed: true, tint: 0x7ad4ff, scale: 0.38 },
    attackSfx: "puff_attack", body: [0.55, 0.6], keepDistance: 200, heartDrop: 0.15,
  },
  ocean_crab: {
    key: "ocean_crab", height: 68, hp: 3, speed: 70, attack: "lunge", range: 140, cooldown: 1800, windup: 420,
    attackSfx: "bat_dive", body: [0.55, 0.75], heartDrop: 0.15,
  },
  desert_scarab: {
    key: "desert_scarab", height: 68, hp: 2, speed: 95, attack: "roll", range: 320, cooldown: 2600, windup: 580,
    attackSfx: "bat_dive", body: [0.55, 0.75], heartDrop: 0.15,
  },
  desert_spirit: {
    key: "desert_spirit", height: 100, hp: 3, speed: 65, flying: true, attack: "shoot", range: 440, cooldown: 2200, windup: 560,
    projectile: { sheet: "fx_dust", speed: 280, aimed: true, tint: 0xffd27a, scale: 0.38 },
    attackSfx: "ghost_orb", body: [0.55, 0.6], keepDistance: 230, heartDrop: 0.15,
  },
};
