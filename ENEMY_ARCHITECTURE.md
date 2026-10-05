# Enemy Architecture — How to Add Chapter-Specific Enemies

## Current System

Enemies are defined in `src/entities/enemyTypes.ts` as `ENEMY_TYPES: Record<string, EnemyType>`.

```typescript
interface EnemyType {
  key: SpriteKey;           // sprite sheet key in sprites.gen.ts
  height: number;           // on-screen display height in px (54-116 range)
  hp: number;
  speed: number;
  flying?: boolean;
  attack: AttackKind;       // "melee" | "lunge" | "roll" | "dive" | "shoot" | "slam" | "lava"
  range: number;            // attack range in px
  cooldown: number;         // ms between attacks
  windup: number;           // ms telegraph before attack
  projectile?: {           // for "shoot" attack
    sheet: ProjectileSheet;
    speed: number;
    aimed: boolean;
    tint?: number;
    scale?: number;
  };
  armoredFront?: boolean;  // blocks frontal attacks (crab-style)
  heartDrop?: number;       // 0-1 chance to drop heart on kill
  attackSfx: string;
  body: [number, number];  // [widthFrac, heightFrac] of sprite for hitbox
  keepDistance?: number;   // for ranged enemies: preferred distance
}
```

Chapter rosters are in `src/config.ts` → `CHAPTERS: Record<ChapterId, ChapterDef>`.
Each chapter has `enemies: string[]` (keys into ENEMY_TYPES).

## Adding a New Enemy (Step by Step)

### 1. Prepare the sprite sheet
- 20 frames in 4 rows × 5 cols (see ASSET_SPECS_FOR_CHATGPT.md)
- Save as `public/assets/runtime/<name>.webp` (220×220 per frame, transparent)
- Register in `src/assets/sprites.gen.ts`:
```typescript
"<name>": {
  "file": "assets/runtime/<name>.webp",
  "frameWidth": 220, "frameHeight": 220,
  "originX": 0.5, "originY": 1.0,
  "bodyHeight": 216,
  "anims": {
    "idle":   { "start": 0, "end": 4,   "fps": 8,  "repeat": -1, "h": <SRC_H> },
    "walk":   { "start": 5, "end": 9,   "fps": 8,  "repeat": -1, "h": <SRC_H> },
    "attack": { "start": 10, "end": 14, "fps": 10, "repeat": 0,  "h": <SRC_H> },
    "hurt":   { "start": 15, "end": 16, "fps": 8,  "repeat": 0,  "h": <SRC_H> },
    "dead":   { "start": 18, "end": 19, "fps": 6,  "repeat": 0,  "h": <SRC_H> }
  }
},
```
- `<SRC_H>` = actual character pixel height in source frames (measure with PIL getbbox)
- The game auto-scales: `display_height = type.height` (from enemyTypes.ts)

### 2. Define the enemy type
Add to `ENEMY_TYPES` in `src/entities/enemyTypes.ts`:
```typescript
my_enemy: {
  key: "my_enemy", height: 80, hp: 3, speed: 90,
  attack: "lunge", range: 140, cooldown: 1800, windup: 400,
  attackSfx: "skeleton_swing", body: [0.6, 0.7], heartDrop: 0.2,
},
```

### 3. Add to chapter roster
In `src/config.ts`, add the key to the chapter's `enemies` array:
```typescript
frozen: {
  enemies: ["frostwolf", "icewisp", "penguin", "yeti", "my_enemy"],
  ...
}
```

## Chapter Themes & Suggested Enemies

| Chapter | Theme | Current | Suggested additions |
|---------|-------|---------|-------------------|
| 1 | Forest | acorn, scarab, wisp | slime, boar, treant |
| 2 | Ruins | gargoyle, spirit, wisp | stone golem, cursed eye, scorpion |
| 3 | Volcano | wisp, lizard, crab, turtle | fire spirit, magma golem |
| 4 | Frozen | frostwolf, icewisp, penguin, yeti | ice golem |
| 5 | Shadow | gargoyle, spirit, wolf, cloud, turtle, wisp | dark mage, shadow bat |
| 6 | Sky | eagle, cloud, gargoyle | sky serpent |
| 7 | Sea | jelly, pufferfish, crab | anglerfish, sea serpent |
| 8 | Desert | scarab, crab, spirit | sandworm (boss), dune crawler |
| 9 | Valley | jelly, pufferfish, crab | squishy variants |

## Size Guidelines
- Small (flying/harassing): 54-74px
- Medium (standard): 80-96px
- Large (tanky): 104-116px
- Boss: 200px+

## Behavior Notes
- Penguins vs wolves: use different `attack` kinds (penguin: "shoot" with ice projectile, wolf: "lunge")
- Ranged enemies: set `keepDistance` so they don't rush the player
- Flying enemies: set `flying: true` (ignores ground collision)
