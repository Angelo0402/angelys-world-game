import type { DialogueLine } from "./umbra";

export const WORM_NAME = "SAND WORM";

export const WORM_INTRO: DialogueLine[] = [
  { who: "angely", face: "surprised", text: "The dune is moving!", voice: "angely_16" },
  { who: "angely", face: "determined", text: "Come on out. I'm not afraid of you.", voice: "angely_17" },
];

export const WORM_PHASE: DialogueLine[] = [
  { who: "angely", face: "determined", text: "It's going under! Watch the sand!", voice: "angely_18" },
];

export const ANGELO_AFTER_WORM: DialogueLine[] = [
  { who: "angelo", text: "You didn't hide, Angely. That thing came out of the sand and you met it.", voice: "angelo_10" },
  { who: "angely", face: "determined", text: "It kept diving. I had to watch the floor.", voice: "angely_19" },
  { who: "angelo", text: "And the Cog Saw. You used it when the sword would have bounced off.", voice: "angelo_11" },
  { who: "angely", face: "happy", text: "I figured the brass out myself.", voice: "angely_20" },
  { who: "angelo", text: "That's the part I came to see. Not a speech. You, thinking.", voice: "angelo_12" },
];

export const ANGELO_LEAVES_RIFT: DialogueLine[] = [
  { who: "angelo", text: "Angely, the next adventure is a world of squishies.", voice: "angelo_13" },
  { who: "angely", face: "happy", text: "Squishies? Like little bouncing blobs?", voice: "angely_21" },
  { who: "angelo", text: "Soft, bright, and trickier than they look. Your stone arch leads there.", voice: "angelo_14" },
  { who: "angelo", text: "This blue gate is mine. I'm stepping back through it. Go on, kiddo.", voice: "angelo_15" },
  { who: "angely", face: "determined", text: "I'll bounce them all. Bye, Dad!", voice: "angely_22" },
];
