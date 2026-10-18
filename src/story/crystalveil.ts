import type { DialogueLine } from "./umbra";

export const VEIL_NAME = "CRYSTAL VEIL";

export const VEIL_INTRO: DialogueLine[] = [
  { who: "angelo", text: "Angely! I'm stuck up here — get me out!", voice: "angelo_01" },
  { who: "angely", face: "surprised", text: "Dad?! Hold on, I'll cut you free!", voice: "angely_01" },
  { who: "angelo", text: "That crystal thing grabbed me. Don't let it get you.", voice: "angelo_02" },
  { who: "angely", face: "determined", text: "Stay put. I'm coming for you.", voice: "angely_02" },
];

export const VEIL_PHASE2: DialogueLine = {
  who: "angely",
  face: "determined",
  text: "The crystals are waking up. Keep moving!",
  voice: "angely_03",
};

export const VEIL_PHASE3: DialogueLine = {
  who: "angely",
  face: "determined",
  text: "It's glowing brighter. Hit it between the beams!",
  voice: "angely_04",
};

export const VEIL_DEFEAT: DialogueLine[] = [
  { who: "angelo", text: "You did it! Get me out of here!", voice: "angelo_03" },
  { who: "angely", face: "happy", text: "I'm coming, Dad!", voice: "angely_05" },
];

export const VEIL_RESCUE: DialogueLine[] = [
  { who: "angelo", text: "That's my girl. I knew you'd find me.", voice: "angelo_04" },
  { who: "angely", face: "happy", text: "I wasn't going to leave you in there.", voice: "angely_06" },
];

export const VEIL_FAREWELL: DialogueLine[] = [
  { who: "angelo", text: "I have to take my gate. You take yours.", voice: "angelo_05" },
  { who: "angelo", text: "Keep going, okay?", voice: "angelo_06" },
  { who: "angely", face: "determined", text: "I will. Love you, Dad!", voice: "angely_07" },
  { who: "angelo", text: "Love you too, kiddo. I'll be watching.", voice: "angelo_07" },
];
