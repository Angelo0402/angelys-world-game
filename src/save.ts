import { LAST_LEVEL, WEAPON_ORDER, type WeaponId } from "./config";

const KEY = "angelys-world-save-v1";
const CHAPTER_LAYOUT_VERSION = 2;

export interface SaveData {
  /** Highest unlocked level index (see LEVELS). */
  level: number;
  /** Version 2 removes Mosswood and moves the final chapter to indices 18/19. */
  chapterLayoutVersion: number;
  weapons: WeaponId[];
  /** Queen Umbra has been defeated at least once. */
  cleared: boolean;
  /** Both Angelo and Angely have crossed the final blue portal. */
  finaleSeen: boolean;
  music: boolean;
  sfx: boolean;
}

const DEFAULTS: SaveData = { level: LAST_LEVEL, chapterLayoutVersion: CHAPTER_LAYOUT_VERSION, weapons: ["sword", "bow", "hammer", "boomerang", "wand", "cog", "ray"], cleared: false, finaleSeen: false, music: true, sfx: true };

let cache: SaveData | null = null;

function normalize(out: SaveData): SaveData {
  return { ...out,
    chapterLayoutVersion: CHAPTER_LAYOUT_VERSION,
    level: Number.isFinite(out.level) ? Math.max(0, Math.min(LAST_LEVEL, Math.floor(out.level))) : 0,
    weapons: WEAPON_ORDER.filter(w => out.weapons.includes(w)),
    finaleSeen: out.finaleSeen === true,
  };
}

/** v1 saves stored the highest unlocked chapter (1-4) and a sword flag. */
function migrate(raw: Record<string, unknown>): SaveData {
  const out = { ...DEFAULTS, ...raw } as SaveData & { unlocked?: number; sword?: boolean };
  if (typeof raw.level !== "number" && typeof out.unlocked === "number") out.level = (out.unlocked - 1) * 2;
  if (!Array.isArray(raw.weapons)) out.weapons = out.sword ? ["sword"] : [];
  // A finished save from before chapter 8 stopped at Coral Palace (index 13).
  if (out.cleared && out.level < 14) out.level = 14;
  // Map the retired two-level chapter only once. Old Mosswood saves start the
  // new final route; old Crystal Veil saves keep their route/boss progress.
  if (raw.chapterLayoutVersion !== CHAPTER_LAYOUT_VERSION && typeof raw.level === "number") {
    out.level = raw.level >= 20 ? raw.level - 2 : raw.level >= 18 ? 18 : out.level;
  }
  out.finaleSeen = raw.finaleSeen === true;
  delete out.unlocked;
  delete out.sword;
  return normalize(out);
}

export function loadSave(): SaveData {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? migrate(JSON.parse(raw)) : { ...DEFAULTS };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache!;
}

export function updateSave(patch: Partial<SaveData>): SaveData {
  const next = normalize({ ...loadSave(), ...patch });
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode / storage full: progress just won't persist.
  }
  return next;
}

export function unlockLevel(index: number) {
  if (index > loadSave().level) updateSave({ level: index });
}

export function addWeapon(w: WeaponId) {
  const have = new Set(loadSave().weapons);
  have.add(w);
  updateSave({ weapons: WEAPON_ORDER.filter((x) => have.has(x)) });
}
