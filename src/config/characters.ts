import type { SpriteKey } from "../assets/sprites.gen";

/**
 * A playable character that can be picked on the co-op character select screen.
 *
 * To add a new playable character later:
 *  1. Add its sprite sheet to `src/assets/sprites.gen.ts` (via tools/build_sprites.py).
 *  2. Append one entry here — the CharacterSelectScene builds its cards from
 *     this array, so no UI changes are needed.
 */
export interface PlayableCharacter {
  /** Stable id, e.g. "angely". Passed through the scene chain as p1Char/p2Char. */
  id: string;
  /** Display name on the card. */
  name: string;
  /** Sprite sheet key in sprites.gen.ts (must have an "idle" anim). */
  sprite: SpriteKey;
  /** Short flavor line shown under the name. */
  description: string;
  /** Card accent color (borders, badges). */
  color: number;
  /** Frame index used for the card portrait. Defaults to 0. */
  portraitFrame?: number;
  /** Set true to show the card greyed out until some unlock condition is met. */
  locked?: boolean;
}

/**
 * When true, Player 2 cannot pick the same character Player 1 picked.
 * If only one character is unlocked/available, duplicates are allowed
 * automatically so co-op is never soft-locked.
 */
export const COOP_UNIQUE_CHARACTERS = true;

export const PLAYABLE_CHARACTERS: PlayableCharacter[] = [
  {
    id: "angely",
    name: "Angely",
    sprite: "angely",
    description: "Brave hero of the light",
    color: 0xff8a3d,
  },
];

/** Look up a character by id, falling back to the first entry (Angely). */
export function getCharacter(id: string | undefined): PlayableCharacter {
  return PLAYABLE_CHARACTERS.find((c) => c.id === id) ?? PLAYABLE_CHARACTERS[0];
}
