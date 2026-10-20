import type { DialogueLine } from "./umbra";

export const VEIL_NAME = "CRYSTAL VEIL";
export const SOVEREIGN_NAME = "THE VEIL SOVEREIGN";

// The Veil's true form rises when its crown breaks. sovereign_01-04 are the
// original recordings (transcription-verified 2026-10-20): 01-03 are the
// rise, 04 is her surrender when the Sovereign form falls.
export const SOVEREIGN_RISE: DialogueLine[] = [
  { who: "sovereign", text: "So, the little light crawls all the way to my veil. How persistent.", voice: "sovereign_01" },
  { who: "sovereign", text: "I am the Veil Sovereign. Every crystal here bows to me. Kneel, child.", voice: "sovereign_02" },
  { who: "sovereign", text: "You cracked my crown? Then feel the full shatter of the Veil!", voice: "sovereign_03" },
];

export const SOVEREIGN_FALL: DialogueLine[] = [
  { who: "sovereign", text: "The veil breaks, little light... The crystals were never mine to keep.", voice: "sovereign_04" },
];

// Voice keys: veil_* files are THIS scene's recordings (ElevenLabs,
// 2026-10-20, content-verified by transcription). The angelo_XX /
// angely_XX files belong to the Colossus finale — never wire them here.
export const VEIL_INTRO: DialogueLine[] = [
  { who: "angelo", text: "Angely! I'm stuck up here — get me out!", voice: "veil_angelo_01" },
  { who: "angely", face: "surprised", text: "Dad?! Hold on, I'll cut you free!", voice: "veil_angely_01" },
  { who: "angelo", text: "That crystal thing grabbed me. Don't let it get you.", voice: "veil_angelo_02" },
  { who: "angely", face: "determined", text: "Stay put. I'm coming for you.", voice: "veil_angely_02" },
];

export const VEIL_PHASE2: DialogueLine = {
  who: "angely",
  face: "determined",
  text: "The crystals are waking up. Keep moving!",
  voice: "veil_angely_03",
};

export const VEIL_PHASE3: DialogueLine = {
  who: "angely",
  face: "determined",
  text: "It's glowing brighter. Hit it between the beams!",
  voice: "veil_angely_04",
};

export const VEIL_DEFEAT: DialogueLine[] = [
  { who: "angelo", text: "You did it! Get me out of here!", voice: "veil_angelo_03" },
  { who: "angely", face: "happy", text: "I'm coming, Dad!", voice: "veil_angely_05" },
];

export const VEIL_RESCUE: DialogueLine[] = [
  { who: "angelo", text: "That's my girl. I knew you'd find me.", voice: "veil_angelo_04" },
  { who: "angely", face: "happy", text: "I wasn't going to leave you in there.", voice: "veil_angely_06" },
];

export const VEIL_FAREWELL: DialogueLine[] = [
  { who: "angelo", text: "I have to take my gate. You take yours.", voice: "veil_angelo_05" },
  { who: "angelo", text: "Keep going, okay?", voice: "veil_angelo_06" },
  { who: "angely", face: "determined", text: "I will. Love you, Dad!", voice: "veil_angely_07" },
  { who: "angelo", text: "Love you too, kiddo. I'll be watching.", voice: "veil_angelo_07" },
];
