import type { DialogueLine } from "./umbra";

export const VEIL_NAME = "CRYSTAL VEIL";

export const VEIL_INTRO: DialogueLine[] = [
  { who: "angely", face: "surprised", text: "Dad! I found you!" },
  { who: "angelo", text: "Angely! The crown is keeping this cage sealed." },
  { who: "angelo", text: "Watch for the pink light. Its core opens after it attacks." },
  { who: "angely", face: "determined", text: "Then I'll break its spell. Hold on, Dad!" },
];

export const VEIL_PHASE2: DialogueLine = {
  who: "angely",
  face: "determined",
  text: "The floor is glowing! Move before the crystals rise!",
};

export const VEIL_PHASE3: DialogueLine = {
  who: "angely",
  face: "determined",
  text: "Here comes the beam! Jump, then strike the core!",
};

export const VEIL_DEFEAT: DialogueLine[] = [
  { who: "angelo", text: "You did it! The lock is losing its light!" },
  { who: "angely", face: "happy", text: "It's over. You're coming home." },
];

export const VEIL_RESCUE: DialogueLine[] = [
  { who: "angelo", text: "My brave girl. You crossed the whole Veil for me." },
  { who: "angely", face: "happy", text: "Of course I did. I wasn't leaving without my dad." },
];

export const VEIL_FAREWELL: DialogueLine[] = [
  { who: "angelo", text: "The blue gate is open. Take my hand, Angely." },
  { who: "angely", face: "happy", text: "We're going together this time, right?" },
  { who: "angelo", text: "Together. Wherever our next adventure takes us." },
  { who: "angely", face: "happy", text: "Love you, Dad. Let's go!" },
];
