import type { DialogueLine } from "./umbra";

export const SOVEREIGN_NAME = "VEIL SOVEREIGN";

export const SOVEREIGN_INTRO: DialogueLine[] = [
  { who: "angely", face: "surprised", text: "The crystals just... stood up." },
  { who: "angely", face: "determined", text: "Crown or not, I'm going through." },
];

export const SOVEREIGN_PHASE: DialogueLine = {
  who: "angely",
  face: "determined",
  text: "He's swinging faster. Stay low and hit between the crescents!",
};

export const SOVEREIGN_DEFEAT: DialogueLine[] = [
  { who: "angely", face: "happy", text: "The veil broke. I can see the next light." },
  { who: "angely", face: "determined", text: "Ember cliffs ahead. I'm not done." },
];
