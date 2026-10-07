import type { DialogueLine } from "./umbra";

export const COLOSSUS_APPEARS: DialogueLine[] = [{ who: "angely", face: "surprised", text: "W-what is THAT?!", voice: "angely_05" }];

export const COLOSSUS_SMASH: DialogueLine[] = [{ who: "angely", face: "surprised", text: "It's too big... somebody, help!", voice: "angely_06" }];

export const ANGELO_ARRIVES: DialogueLine[] = [{ who: "angelo", text: "Hey! Get away from my daughter!", voice: "angelo_01" }];

export const ANGELO_TALK: DialogueLine[] = [
  { who: "angelo", text: "Angely! Are you okay, sweetheart?", voice: "angelo_02" },
  { who: "angely", face: "happy", text: "Dad?! You came!", voice: "angely_07" },
  { who: "angelo", text: "Of course I came. I've been watching you this whole time.", voice: "angelo_03" },
  { who: "angelo", text: "The forest, the ruins, the volcano, the frozen peaks... and you beat Queen Umbra all by yourself!", voice: "angelo_04" },
  { who: "angelo", text: "You are SO good at this game, Angely. Seriously. I'm so proud of you.", voice: "angelo_05" },
  { who: "angely", face: "happy", text: "I learned from the best, Dad!", voice: "angely_08" },
  { who: "angelo", text: "Ha! Listen... your adventure isn't over yet. A tower in the sky and a temple under the sea still need your light.", voice: "angelo_06" },
  { who: "angelo", text: "Keep going, and don't ever give up. I'll be watching you the whole way.", voice: "angelo_07" },
  { who: "angely", face: "determined", text: "I won't let you down!", voice: "angely_09" },
];

export const ANGELO_FAREWELL: DialogueLine[] = [
  { who: "angelo", text: "Angely, I'll be watching you. I'll be back. I have stuff to do, but be careful.", voice: "angelo_08" },
  { who: "angely", face: "happy", text: "Bye, Dad! I love you!", voice: "angely_10" },
  { who: "angelo", text: "Love you too, kiddo.", voice: "angelo_09" },
];
