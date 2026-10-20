import type { DialogueLine } from "./umbra";

// Voice wiring verified 2026-10-20 by transcribing every recording.
// Several Angelo recordings merge two consecutive script lines into one
// take; those are wired to the FIRST line and the second line stays
// subtitle-only (same pattern as the Colossus takes in crystalveil fixing):
//   angelo_04 = TALK lines 4-5 · angelo_05 = TALK lines 6-7
//   angelo_06 = TALK lines 9-10 · angelo_07 = TALK lines 11-12
//   angelo_08 = FAREWELL lines 1-2

export const COLOSSUS_APPEARS: DialogueLine[] = [{ who: "angely", face: "surprised", text: "W-what is THAT?!", voice: "angely_05" }];

export const COLOSSUS_SMASH: DialogueLine[] = [{ who: "angely", face: "surprised", text: "It's too big... somebody, help!", voice: "angely_06" }];

export const ANGELO_ARRIVES: DialogueLine[] = [{ who: "angelo", text: "Hey! Get away from my daughter!", voice: "angelo_01" }];

export const ANGELO_TALK: DialogueLine[] = [
  { who: "angelo", text: "Angely! Are you okay, sweetheart?", voice: "angelo_02" },
  { who: "angely", face: "happy", text: "Dad?! You came!", voice: "angely_07" },
  { who: "angelo", text: "Of course I came. I've been watching you this whole time.", voice: "angelo_03" },
  { who: "angelo", text: "The forest, the ruins, the volcano, the frozen peaks...", voice: "angelo_04" },
  { who: "angelo", text: "...and you beat Queen Umbra all by yourself!" },
  { who: "angelo", text: "You are SO brave, Angely.", voice: "angelo_05" },
  { who: "angelo", text: "Seriously. I'm so proud of you." },
  { who: "angely", face: "happy", text: "I learned from the best, Dad!", voice: "angely_08" },
  { who: "angelo", text: "Ha! Listen... your adventure isn't over yet.", voice: "angelo_06" },
  { who: "angelo", text: "A tower in the sky and a temple under the sea still need your light." },
  { who: "angelo", text: "Keep going, and don't ever give up.", voice: "angelo_07" },
  { who: "angelo", text: "I'll be watching you the whole way." },
  { who: "angely", face: "determined", text: "I won't let you down!", voice: "angely_09" },
];

export const ANGELO_FAREWELL: DialogueLine[] = [
  { who: "angelo", text: "Angely, I'll be watching you. I'll be back.", voice: "angelo_08" },
  { who: "angelo", text: "I have stuff to do, but be careful." },
  { who: "angely", face: "happy", text: "Bye, Dad! I love you!", voice: "angely_10" },
  { who: "angelo", text: "Love you too, kiddo.", voice: "angelo_09" },
];
