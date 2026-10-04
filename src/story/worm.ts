import type { DialogueLine } from "./umbra";

export const WORM_NAME = "SAND WORM";

export const WORM_INTRO: DialogueLine[] = [
  { who: "angely", face: "surprised", text: "The dune is moving!" },
  { who: "angely", face: "determined", text: "Come on out. I'm not afraid of you." },
];

export const WORM_PHASE: DialogueLine[] = [
  { who: "angely", face: "determined", text: "It's going under! Watch the sand!" },
];

export const ANGELO_AFTER_WORM: DialogueLine[] = [
  { who: "angelo", text: "You didn't hide, Angely. That thing came out of the sand and you met it." },
  { who: "angely", face: "determined", text: "It kept diving. I had to watch the floor." },
  { who: "angelo", text: "And the Cog Saw. You used it when the sword would have bounced off." },
  { who: "angely", face: "happy", text: "I figured the brass out myself." },
  { who: "angelo", text: "That's the part I came to see. Not a speech. You, thinking." },
];

export const ANGELO_LEAVES_RIFT: DialogueLine[] = [
  { who: "angelo", text: "Angely, the next adventure is a world of squishies." },
  { who: "angely", face: "happy", text: "Squishies? Like little bouncing blobs?" },
  { who: "angelo", text: "Soft, bright, and trickier than they look. Your stone arch leads there." },
  { who: "angelo", text: "This blue gate is mine. I'm stepping back through it. Go on, kiddo." },
  { who: "angely", face: "determined", text: "I'll bounce them all. Bye, Dad!" },
];
