import type { SpriteKey } from "../assets/sprites.gen";
import type { SfxName } from "../audio/manifest";

export type AttackKind = "melee" | "lunge" | "roll" | "dive" | "shoot" | "slam" | "lava";
export type ProjectileSheet = "fx_orb" | "fx_bolt" | "fx_fireball" | "fx_dust";

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
    key: "mushroom", height: 74, hp: 1, speed: 55, attack: "shoot", range: 330, cooldown: 2600, windup: 520,
    projectile: { sheet: "fx_dust", speed: 170, aimed: false, tint: 0xc9ff9a, scale: 0.32 },
    attackSfx: "puff_attack", body: [0.5, 0.8], keepDistance: 140,
  },
  beetle: {
    key: "beetle", height: 66, hp: 2, speed: 65, attack: "roll", range: 340, cooldown: 2800, windup: 600,
    attackSfx: "bat_dive", body: [0.55, 0.75],
  },
  leafimp: {
    key: "leafimp", height: 84, hp: 1, speed: 88, attack: "lunge", range: 120, cooldown: 1800, windup: 420,
    attackSfx: "skeleton_swing", body: [0.42, 0.85],
  },
  firefly: {
    key: "firefly", height: 60, hp: 1, speed: 105, flying: true, attack: "dive", range: 260, cooldown: 2600, windup: 520,
    attackSfx: "bat_dive", body: [0.55, 0.6],
  },
  // Chapter 2: Moonlit Ruins
  golem: {
    key: "golem", height: 104, hp: 3, speed: 42, attack: "slam", range: 150, cooldown: 2600, windup: 750,
    attackSfx: "ground_slam", body: [0.5, 0.85], heartDrop: 0.3,
  },
  ghost: {
    key: "ghost", height: 82, hp: 2, speed: 70, flying: true, attack: "shoot", range: 460, cooldown: 2400, windup: 560,
    projectile: { sheet: "fx_orb", speed: 250, aimed: true, scale: 0.34 },
    attackSfx: "ghost_orb", body: [0.5, 0.6], keepDistance: 240,
  },
  lantern: {
    key: "lantern", height: 84, hp: 2, speed: 78, flying: true, attack: "shoot", range: 480, cooldown: 2200, windup: 520,
    projectile: { sheet: "fx_bolt", speed: 360, aimed: true, scale: 0.34 },
    attackSfx: "lantern_bolt", body: [0.5, 0.6], keepDistance: 280,
  },
  skeleton: {
    key: "skeleton", height: 96, hp: 2, speed: 82, attack: "lunge", range: 125, cooldown: 1700, windup: 430,
    attackSfx: "skeleton_swing", body: [0.42, 0.85],
  },
  // Chapter 3: Volcanic Caves
  firebat: {
    key: "firebat", height: 64, hp: 1, speed: 110, flying: true, attack: "shoot", range: 460, cooldown: 2000, windup: 480,
    projectile: { sheet: "fx_fireball", speed: 300, aimed: true, scale: 0.34 },
    attackSfx: "fire_spit", body: [0.5, 0.6], keepDistance: 230,
  },
  lavablob: {
    key: "lavablob", height: 54, hp: 2, speed: 50, attack: "lava", range: 220, cooldown: 3200, windup: 600,
    attackSfx: "lava_burst", body: [0.55, 0.75],
  },
  crab: {
    key: "crab", height: 70, hp: 3, speed: 80, attack: "melee", range: 115, cooldown: 1600, windup: 450, armoredFront: true,
    attackSfx: "skeleton_swing", body: [0.55, 0.75], heartDrop: 0.25,
  },
  magmagolem: {
    key: "magmagolem", height: 112, hp: 4, speed: 44, attack: "slam", range: 150, cooldown: 2500, windup: 780,
    attackSfx: "ground_slam", body: [0.5, 0.85], heartDrop: 0.35,
  },
  // Chapter 4: Frozen Peaks
  frostwolf: {
    key: "frostwolf", height: 72, hp: 2, speed: 96, attack: "lunge", range: 135, cooldown: 1600, windup: 400,
    attackSfx: "skeleton_swing", body: [0.55, 0.75],
  },
  icewisp: {
    key: "icewisp", height: 66, hp: 2, speed: 85, flying: true, attack: "shoot", range: 470, cooldown: 2100, windup: 500,
    projectile: { sheet: "fx_orb", speed: 330, aimed: true, tint: 0xa8f0ff, scale: 0.34 },
    attackSfx: "lantern_bolt", body: [0.5, 0.6], keepDistance: 250,
  },
  penguin: {
    key: "penguin", height: 70, hp: 2, speed: 70, attack: "roll", range: 360, cooldown: 2500, windup: 550,
    attackSfx: "bat_dive", body: [0.55, 0.8],
  },
  yeti: {
    key: "yeti", height: 116, hp: 4, speed: 46, attack: "slam", range: 155, cooldown: 2400, windup: 760,
    attackSfx: "ground_slam", body: [0.5, 0.85], heartDrop: 0.35,
  },
  // Chapter 6: The Sky Tower (30-frame sheets)
  stormbird: {
    key: "stormbird", height: 70, hp: 2, speed: 120, flying: true, attack: "dive", range: 300, cooldown: 2300, windup: 480,
    attackSfx: "bat_dive", body: [0.55, 0.6],
  },
  thunderimp: {
    key: "thunderimp", height: 68, hp: 2, speed: 80, flying: true, attack: "shoot", range: 480, cooldown: 2300, windup: 620,
    projectile: { sheet: "fx_bolt", speed: 380, aimed: true, tint: 0xfff27a, scale: 0.36 },
    attackSfx: "lantern_bolt", body: [0.55, 0.6], keepDistance: 260, heartDrop: 0.2,
  },
  // Chapter 7: The Sunken Temple
  jellyfish: {
    key: "jellyfish", height: 80, hp: 2, speed: 55, flying: true, attack: "melee", range: 120, cooldown: 1900, windup: 520,
    attackSfx: "lantern_bolt", body: [0.5, 0.55],
  },
  // Chapter 8: The Clockwork Desert
  cogmoth: {
    key: "cogmoth", height: 68, hp: 1, speed: 115, flying: true, attack: "dive", range: 280, cooldown: 2200, windup: 460,
    attackSfx: "bat_dive", body: [0.55, 0.55],
  },
  gearcrab: {
    key: "gearcrab", height: 72, hp: 3, speed: 70, attack: "melee", range: 120, cooldown: 1600, windup: 440, armoredFront: true,
    attackSfx: "skeleton_swing", body: [0.55, 0.75], heartDrop: 0.25,
  },
  // Chapter 9: Squishy Valley
  blob: {
    key: "blob", height: 68, hp: 1, speed: 62, attack: "shoot", range: 340, cooldown: 2200, windup: 480,
    projectile: { sheet: "fx_orb", speed: 240, aimed: true, tint: 0xb6ff6a, scale: 0.32 },
    attackSfx: "puff_attack", body: [0.55, 0.7], keepDistance: 150,
  },
  squish: {
    key: "squish", height: 76, hp: 2, speed: 88, attack: "lunge", range: 130, cooldown: 1600, windup: 380,
    attackSfx: "bat_dive", body: [0.55, 0.75],
  },
  toxic: {
    key: "toxic", height: 72, hp: 3, speed: 54, attack: "shoot", range: 400, cooldown: 2000, windup: 520,
    projectile: { sheet: "fx_orb", speed: 300, aimed: true, tint: 0x7dff4a, scale: 0.36 },
    attackSfx: "fire_spit", body: [0.6, 0.7], keepDistance: 180, heartDrop: 0.2,
  },
  sandwisp: {
    key: "sandwisp", height: 74, hp: 2, speed: 78, flying: true, attack: "shoot", range: 460, cooldown: 2100, windup: 540,
    projectile: { sheet: "fx_dust", speed: 280, aimed: true, tint: 0xffd27a, scale: 0.36 },
    attackSfx: "puff_attack", body: [0.5, 0.6], keepDistance: 240, heartDrop: 0.2,
  },
  // Chapter 10: The Star Orchard
  starling: {
    key: "starling", height: 64, hp: 1, speed: 112, flying: true, attack: "dive", range: 280, cooldown: 2200, windup: 460,
    attackSfx: "bat_dive", body: [0.55, 0.6],
  },
  moonhare: {
    key: "moonhare", height: 74, hp: 2, speed: 102, attack: "lunge", range: 140, cooldown: 1500, windup: 360,
    attackSfx: "skeleton_swing", body: [0.5, 0.75],
  },
  seedlamp: {
    key: "seedlamp", height: 86, hp: 2, speed: 48, attack: "shoot", range: 380, cooldown: 2100, windup: 500,
    projectile: { sheet: "fx_orb", speed: 260, aimed: true, tint: 0xffe7a3, scale: 0.34 },
    attackSfx: "lantern_bolt", body: [0.5, 0.8], keepDistance: 180,
  },
  cometpup: {
    key: "cometpup", height: 62, hp: 2, speed: 78, attack: "roll", range: 340, cooldown: 2400, windup: 520,
    attackSfx: "bat_dive", body: [0.6, 0.7], heartDrop: 0.2,
  },
  anglerfish: {
    key: "anglerfish", height: 70, hp: 2, speed: 75, flying: true, attack: "shoot", range: 460, cooldown: 2200, windup: 560,
    projectile: { sheet: "fx_orb", speed: 280, aimed: true, tint: 0xfff27a, scale: 0.36 },
    attackSfx: "ghost_orb", body: [0.55, 0.55], keepDistance: 240, heartDrop: 0.2,
  },
};
