import { WEAPON_ORDER, type WeaponId } from "./config";

const KEY = "angelys-world-save-v1";

export interface SaveData {
  /** Highest unlocked level index (see LEVELS). */
  level: number;
  weapons: WeaponId[];
  /** Queen Umbra has been defeated at least once. */
  cleared: boolean;
  music: boolean;
  sfx: boolean;
}

const DEFAULTS: SaveData = { level: 27, weapons: ["sword", "bow", "hammer", "boomerang", "wand", "cog", "ray"], cleared: false, music: true, sfx: true };

let cache: SaveData | null = null;

/** v1 saves stored the highest unlocked chapter (1-4) and a sword flag. */
function migrate(raw: Record<string, unknown>): SaveData {
  const out = { ...DEFAULTS, ...raw } as SaveData & { unlocked?: number; sword?: boolean };
  if (typeof raw.level !== "number" && typeof out.unlocked === "number") out.level = (out.unlocked - 1) * 2;
  if (!Array.isArray(raw.weapons)) out.weapons = out.sword ? ["sword"] : [];
  // A finished save from before chapter 8 stopped at Coral Palace (index 13).
  if (out.cleared && out.level < 14) out.level = 14;
  delete out.unlocked;
  delete out.sword;
  return out;
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
  const next = { ...loadSave(), ...patch };
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
