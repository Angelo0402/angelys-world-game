import type { DialogueLine } from "./umbra";

export const SOVEREIGN_NAME = "VEIL SOVEREIGN";

export const SOVEREIGN_INTRO: DialogueLine[] = [
  { who: "angely", face: "surprised", text: "The crystals just... stood up.", voice: "angely_11" },
  { who: "angely", face: "determined", text: "Crown or not, I'm going through.", voice: "angely_12" },
];

export const SOVEREIGN_PHASE: DialogueLine = { who: "angely",
  face: "determined",
  text: "He's swinging faster. Stay low and hit between the crescents!", voice: "angely_13",
};

/** The final boss speaks: taunts before the fight. */
export const SOVEREIGN_TAUNT: DialogueLine[] = [
  { who: "sovereign", text: "So. The little light crawls all the way to my veil. How... persistent.", voice: "sovereign_01" },
  { who: "sovereign", text: "I am the Veil Sovereign. Every crystal here bows to me. Kneel, child.", voice: "sovereign_02" },
];

export const SOVEREIGN_ENRAGE: DialogueLine = {
  who: "sovereign",
  text: "You crack my crown?! Then feel the full shatter of the Veil!",
  voice: "sovereign_03",
};

export const SOVEREIGN_DEFEAT: DialogueLine[] = [
  { who: "angely", face: "happy", text: "The veil broke. I can see the next light.", voice: "angely_14" },
  { who: "angely", face: "determined", text: "Ember cliffs ahead. I'm not done.", voice: "angely_15" },
];

export const SOVEREIGN_FALL: DialogueLine = {
  who: "sovereign",
  text: "The veil... breaks... Little light... the crystals were never mine to keep...",
  voice: "sovereign_04",
};
