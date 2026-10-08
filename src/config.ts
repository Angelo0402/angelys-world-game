export const GAME_W = 1280;
export const GAME_H = 576;
export const GROUND_Y = 500;
export const MAX_HEARTS = 5;

export type ChapterId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export const LAST_CHAPTER: ChapterId = 10;
export type MusicTrack =
  | "music_title"
  | "music_forest"
  | "music_ruins"
  | "music_volcano"
  | "music_frozen"
  | "music_shadow"
  | "music_boss"
  | "music_sky"
  | "music_sea"
  | "music_clock"
  | "music_squish"
  | "music_game_over"
  | "music_victory";

export type WeaponId = "sword" | "bow" | "hammer" | "boomerang" | "wand" | "cog" | "ray";
export const WEAPON_ORDER: WeaponId[] = ["sword", "bow", "hammer", "boomerang", "wand", "cog", "ray"];
export const WEAPON_NAMES: Record<WeaponId, string> = {
  sword: "Crystal Sword",
  bow: "Star Bow",
  hammer: "Ember Hammer",
  boomerang: "Moon Boomerang",
  wand: "Star Wand",
  cog: "Cog Saw",
  ray: "Bubble Ray",
};

export interface ChapterDef {
  id: ChapterId;
  name: string;
  splash: string;
  background: string;
  music: MusicTrack;
  enemies: string[];
  maxAlive: number;
  spawnEvery: number;
  pitKind: "pit" | "lava";
  /** Ground friction multiplier; below 1 the floor is slippery. */
  grip: number;
  ambient: { color: number; count: number };
  /** Tint applied to enemies, so the final chapter's mixed roster looks shadow-touched. */
  enemyTint?: number;
}

export const CHAPTERS: Record<ChapterId, ChapterDef> = {
  1: {
    id: 1,
    name: "The Enchanted Forest",
    splash: "splash1",
    background: "bg1",
    music: "music_forest",
    enemies: ["mushroom", "beetle", "leafimp", "firefly"],
    maxAlive: 4,
    spawnEvery: 1.7,
    pitKind: "pit",
    grip: 1,
    ambient: { color: 0xfff27a, count: 26 },
  },
  2: {
    id: 2,
    name: "Moonlit Ruins",
    splash: "splash2",
    background: "bg2",
    music: "music_ruins",
    enemies: ["golem", "ghost", "lantern", "skeleton"],
    maxAlive: 4,
    spawnEvery: 1.85,
    pitKind: "pit",
    grip: 1,
    ambient: { color: 0xb9a8ff, count: 30 },
  },
  3: {
    id: 3,
    name: "Volcanic Caves",
    splash: "splash3",
    background: "bg3",
    music: "music_volcano",
    enemies: ["firebat", "lavablob", "crab", "magmagolem"],
    maxAlive: 4,
    spawnEvery: 1.75,
    pitKind: "lava",
    grip: 1,
    ambient: { color: 0xff8a3d, count: 40 },
  },
  4: {
    id: 4,
    name: "Frozen Peaks",
    splash: "splash4",
    background: "bg4",
    music: "music_frozen",
    enemies: ["frostwolf", "icewisp", "penguin", "yeti"],
    maxAlive: 4,
    spawnEvery: 1.7,
    pitKind: "pit",
    grip: 0.22,
    ambient: { color: 0xe6f6ff, count: 46 },
  },
  5: {
    id: 5,
    name: "The Shadow Castle",
    splash: "splash5",
    background: "bg5",
    music: "music_shadow",
    enemies: ["skeleton", "ghost", "frostwolf", "firebat", "magmagolem", "icewisp", "lavablob", "shardknight", "voidwraith"],
    maxAlive: 4,
    spawnEvery: 1.6,
    pitKind: "pit",
    grip: 1,
    ambient: { color: 0xc59bff, count: 40 },
    enemyTint: 0xd8c4ff,
  },
  6: {
    id: 6,
    name: "The Sky Tower",
    splash: "splash6",
    background: "bg6",
    music: "music_sky",
    enemies: ["stormbird", "thunderimp", "stormbird", "golem"],
    maxAlive: 4,
    spawnEvery: 1.6,
    pitKind: "pit",
    grip: 1,
    ambient: { color: 0xffffff, count: 30 },
  },
  7: {
    id: 7,
    name: "The Sunken Temple",
    splash: "splash7",
    background: "bg7",
    music: "music_sea",
    enemies: ["jellyfish", "anglerfish", "crab", "jellyfish"],
    maxAlive: 4,
    spawnEvery: 1.8,
    pitKind: "pit",
    grip: 1,
    ambient: { color: 0x9ff5ff, count: 34 },
  },
  8: {
    id: 8,
    name: "The Clockwork Desert",
    splash: "splash8",
    background: "bg8",
    music: "music_clock",
    enemies: ["cogmoth", "gearcrab", "sandwisp", "gearcrab"],
    maxAlive: 4,
    spawnEvery: 1.7,
    pitKind: "pit",
    grip: 1,
    ambient: { color: 0xffd27a, count: 36 },
  },
  9: {
    id: 9,
    name: "Squishy Valley",
    splash: "splash9",
    background: "bg9",
    music: "music_squish",
    enemies: ["squish", "blob", "toxic", "squish"],
    maxAlive: 4,
    spawnEvery: 1.7,
    pitKind: "pit",
    grip: 1,
    ambient: { color: 0xffb7e8, count: 30 },
  },
  10: {
    id: 10,
    name: "The Crystal Veil",
    splash: "splash10",
    background: "bg10",
    music: "music_shadow",
    enemies: ["shardknight", "voidwraith", "galaxmaw", "stormgolem", "skeleton", "firebat", "lavablob", "magmagolem"],
    maxAlive: 4,
    spawnEvery: 1.9,
    pitKind: "pit",
    grip: 1,
    ambient: { color: 0xb7a6ff, count: 34 },
  },
};

/**
 * Set pieces a side-scrolling level is assembled from (see world/level.ts):
 * hops/steps/spikes   classic jumping
 * spring              tall wall, bounce over it on a spring
 * crateWall           tall wall, push the crate against it and climb
 * movingBridge        wide pit crossed on a sliding platform
 * lift                very tall wall with an elevator platform
 * crumble             wide pit over platforms that collapse after landing
 * target              wide pit; shoot the star target to raise a bridge (bow)
 * breakWall           cracked wall that only the hammer can smash
 * mines               floating spiked urchins bobbing across the path
 * gate                a gap between a wall below and one hanging from above (swim)
 */
export type PieceKind =
  | "hops" | "steps" | "spikes" | "spring" | "crateWall" | "movingBridge" | "lift" | "crumble" | "target" | "breakWall" | "mines" | "gate";

/**
 * run    free side-scrolling
 * chase  the screen scrolls by itself and a collapse/avalanche chases Angely
 * climb  a vertical tower: climb to the portal at the top
 * swim   underwater: JUMP swims upward, gravity is light
 */
export type LevelMode = "run" | "chase" | "climb" | "swim";
/** kills: defeat N enemies; gems: collect N star gems; reach: the portal is open, get there; boss. */
export type GoalKind = "kills" | "gems" | "reach" | "boss";
/** flat ground, rolling hills (low terraces) or cliffs (tall terraces). */
export type Terrain = "flat" | "hills" | "cliffs";

export interface LevelInfo {
  index: number;
  chapter: ChapterId;
  stage: 1 | 2;
  name: string;
  mode: LevelMode;
  goal: GoalKind;
  /** Enemies (kills) or gems (gems) needed. */
  need: number;
  terrain: Terrain;
  seed: number;
  pieces: PieceKind[];
  /** Weapon found on this level (a sword stone / floating pickup near the start). */
  weapon?: WeaponId;
  /** Climb: a storm flood rises from below. */
  flood?: boolean;
  boss?: boolean;
  tip: string;
}

const L = (l: Omit<LevelInfo, "index">, index: number): LevelInfo => ({ ...l, index });

export const LEVELS: LevelInfo[] = [
  { chapter: 1, stage: 1, name: "Mushroom Meadow", mode: "run", goal: "kills", need: 8, terrain: "flat", seed: 11, pieces: ["hops", "steps", "spring", "hops"], tip: "Jump on enemies to stomp them!" },
  { chapter: 1, stage: 2, name: "Old Oak Hills", mode: "run", goal: "gems", need: 6, terrain: "hills", seed: 17, pieces: ["crateWall", "hops", "movingBridge", "steps", "crateWall", "spring"], tip: "Collect the star gems hidden in the hills" },
  { chapter: 2, stage: 1, name: "Moonlit Gate", mode: "run", goal: "kills", need: 10, terrain: "cliffs", seed: 23, pieces: ["steps", "crateWall", "crumble", "spikes", "spring"], weapon: "sword", tip: "Find the Crystal Sword!" },
  { chapter: 2, stage: 2, name: "Crumbling Halls", mode: "run", goal: "boss", need: 0, terrain: "flat", seed: 29, pieces: [], boss: true, tip: "Defeat the Moonlit Warden!" },
  { chapter: 3, stage: 1, name: "Ember Tunnels", mode: "run", goal: "kills", need: 10, terrain: "flat", seed: 37, pieces: ["hops", "target", "movingBridge", "spikes", "target"], weapon: "bow", tip: "Shoot star targets to raise bridges" },
  { chapter: 3, stage: 2, name: "Magma Lift", mode: "run", goal: "gems", need: 6, terrain: "cliffs", seed: 41, pieces: ["lift", "crateWall", "movingBridge", "target", "lift", "steps"], tip: "Ride the lifts and grab every gem" },
  { chapter: 4, stage: 1, name: "Slippery Slopes", mode: "run", goal: "kills", need: 12, terrain: "hills", seed: 53, pieces: ["breakWall", "crateWall", "crumble", "steps", "breakWall"], weapon: "hammer", tip: "Smash cracked walls with the hammer" },
  { chapter: 4, stage: 2, name: "Avalanche Run", mode: "run", goal: "kills", need: 12, terrain: "hills", seed: 59, pieces: ["hops", "spring", "crumble", "steps", "spikes", "crumble", "hops", "spring"], tip: "Watch for falling snow!" },
  { chapter: 5, stage: 1, name: "Shadow Bridge", mode: "run", goal: "kills", need: 12, terrain: "cliffs", seed: 67, pieces: ["crateWall", "target", "crumble", "breakWall", "movingBridge", "lift"], tip: "Use everything you have learned" },
  { chapter: 5, stage: 2, name: "Umbra's Throne", mode: "run", goal: "boss", need: 0, terrain: "flat", seed: 71, pieces: [], boss: true, tip: "Defeat Queen Umbra!" },
  { chapter: 6, stage: 1, name: "Sky Tower", mode: "climb", goal: "reach", need: 0, terrain: "flat", seed: 79, pieces: [], weapon: "boomerang", tip: "Springs and lifts help you climb" },
  { chapter: 6, stage: 2, name: "Storm Spire", mode: "climb", goal: "reach", need: 0, terrain: "flat", seed: 83, pieces: [], flood: true, tip: "The storm is rising. Climb fast!" },
  { chapter: 7, stage: 1, name: "Sunken Temple", mode: "swim", goal: "kills", need: 10, terrain: "hills", seed: 89, pieces: ["hops", "mines", "gate", "spikes", "mines", "gate", "target"], weapon: "wand", tip: "Press JUMP to swim. Watch out for urchins!" },
  { chapter: 7, stage: 2, name: "Coral Palace", mode: "swim", goal: "gems", need: 8, terrain: "cliffs", seed: 97, pieces: ["hops", "mines", "gate", "steps", "mines", "gate", "target", "spikes", "gate", "mines"], tip: "Swim through the palace and find all 8 star gems" },
  { chapter: 8, stage: 1, name: "Cog Dunes", mode: "run", goal: "kills", need: 12, terrain: "hills", seed: 101, pieces: ["hops", "movingBridge", "crateWall", "spikes", "lift", "crumble"], weapon: "cog", tip: "Grab the Cog Saw. It cuts through gear crabs!" },
  { chapter: 8, stage: 2, name: "Dune Worm", mode: "run", goal: "boss", need: 0, terrain: "flat", seed: 109, pieces: [], boss: true, tip: "The sand worm rises from the dune. Hit it while it is up!" },
  { chapter: 9, stage: 1, name: "Gumdrop Trail", mode: "run", goal: "kills", need: 10, terrain: "hills", seed: 113, pieces: ["hops", "spring", "steps", "spikes", "crateWall"], weapon: "ray", tip: "Grab the Bubble Ray and zap the squishies!" },
  { chapter: 9, stage: 2, name: "Bubble Falls", mode: "run", goal: "gems", need: 6, terrain: "cliffs", seed: 127, pieces: ["hops", "movingBridge", "crumble", "spring", "spikes", "steps"], tip: "Bounce the springs and find every star gem" },
  { chapter: 10, stage: 1, name: "Shattered Causeway", mode: "run", goal: "kills", need: 12, terrain: "cliffs", seed: 149, pieces: [], tip: "Cross the crystal bridges. Clear twelve guardians to reach the crown." },
  { chapter: 10, stage: 2, name: "The Veil Crown", mode: "run", goal: "boss", need: 0, terrain: "flat", seed: 151, pieces: [], boss: true, tip: "Watch the pink warnings. Strike the core after each attack to free Angelo." },
].map((l, i) => L(l as Omit<LevelInfo, "index">, i));

export const LAST_LEVEL = LEVELS.length - 1;

export const levelLabel = (l: LevelInfo) => `${l.chapter}-${l.stage}`;

export function levelsOf(chapter: ChapterId) {
  return LEVELS.filter((l) => l.chapter === chapter);
}

/** Weapons Angely owns when starting `index` (everything found on earlier levels). */
export function weaponsBefore(index: number): WeaponId[] {
  return LEVELS.filter((l) => l.index < index && l.weapon).map((l) => l.weapon!);
}

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
