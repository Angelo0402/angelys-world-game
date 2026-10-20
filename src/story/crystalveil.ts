import type { DialogueLine } from "./umbra";

export const VEIL_NAME = "CRYSTAL VEIL";

export const VEIL_INTRO: DialogueLine[] = [
  { who: "angelo", text: "Angely! I'm stuck up here — get me out!" },
  { who: "angely", face: "surprised", text: "Dad?! Hold on, I'll cut you free!" },
  { who: "angelo", text: "That crystal thing grabbed me. Don't let it get you." },
  { who: "angely", face: "determined", text: "Stay put. I'm coming for you." },
];

export const VEIL_PHASE2: DialogueLine = {
  who: "angely",
  face: "determined",
  text: "The crystals are waking up. Keep moving!",
};

export const VEIL_PHASE3: DialogueLine = {
  who: "angely",
  face: "determined",
  text: "It's glowing brighter. Hit it between the beams!",
};

export const VEIL_DEFEAT: DialogueLine[] = [
  { who: "angelo", text: "You did it! Get me out of here!" },
  { who: "angely", face: "happy", text: "I'm coming, Dad!" },
];

export const VEIL_RESCUE: DialogueLine[] = [
  { who: "angelo", text: "That's my girl. I knew you'd find me." },
  { who: "angely", face: "happy", text: "I wasn't going to leave you in there." },
];

export const VEIL_FAREWELL: DialogueLine[] = [
  { who: "angelo", text: "I have to take my gate. You take yours." },
  { who: "angelo", text: "Keep going, okay?" },
  { who: "angely", face: "determined", text: "I will. Love you, Dad!" },
  { who: "angelo", text: "Love you too, kiddo. I'll be watching." },
];
