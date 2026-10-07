import type { DialogueLine } from "./umbra";

export const VEIL_NAME = "CRYSTAL VEIL";

export const VEIL_INTRO: DialogueLine[] = [
  { who: "angely", face: "surprised", text: "Dad! I found you!", voice: "angely_23" },
  { who: "angelo", text: "Angely! The crown is keeping this cage sealed.", voice: "angelo_16" },
  { who: "angelo", text: "Watch for the pink light. Its core opens after it attacks.", voice: "angelo_17" },
  { who: "angely", face: "determined", text: "Then I'll break its spell. Hold on, Dad!", voice: "angely_24" },
];

export const VEIL_PHASE2: DialogueLine = { who: "angely",
  face: "determined",
  text: "The floor is glowing! Move before the crystals rise!", voice: "angely_25",
};

export const VEIL_PHASE3: DialogueLine = { who: "angely",
  face: "determined",
  text: "Here comes the beam! Jump, then strike the core!", voice: "angely_26",
};

export const VEIL_DEFEAT: DialogueLine[] = [
  { who: "angelo", text: "You did it! The lock is losing its light!", voice: "angelo_18" },
  { who: "angely", face: "happy", text: "It's over. You're coming home.", voice: "angely_27" },
];

export const VEIL_RESCUE: DialogueLine[] = [
  { who: "angelo", text: "My brave girl. You crossed the whole Veil for me.", voice: "angelo_19" },
  { who: "angely", face: "happy", text: "Of course I did. I wasn't leaving without my dad.", voice: "angely_28" },
];

export const VEIL_FAREWELL: DialogueLine[] = [
  { who: "angelo", text: "The blue gate is open. Take my hand, Angely.", voice: "angelo_20" },
  { who: "angely", face: "happy", text: "We're going together this time, right?", voice: "angely_29" },
  { who: "angelo", text: "Together. Wherever our next adventure takes us.", voice: "angelo_21" },
  { who: "angely", face: "happy", text: "Love you, Dad. Let's go!", voice: "angely_30" },
];
