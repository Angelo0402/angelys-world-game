import type { DialogueLine } from "./umbra";

export const WORM_NAME = "SAND WORM";

export const WORM_INTRO: DialogueLine[] = [
  { who: "angely", face: "surprised", text: "The dune is moving!" },
  { who: "angely", face: "determined", text: "Come on out. I'm not scared of you." },
];

export const WORM_PHASE: DialogueLine[] = [
  { who: "angely", face: "determined", text: "It's going under! Watch the sand!" },
];

export const ANGELO_AFTER_WORM: DialogueLine[] = [
  { who: "angelo", text: "You didn't hide, Angely. That thing popped out of the sand," },
  { who: "angelo", text: "and you faced it head on." },
  { who: "angely", face: "determined", text: "It kept diving. I had to watch the floor." },
  { who: "angelo", text: "And the Cog Saw! You used it right when the sword would've bounced off." },
  { who: "angely", face: "happy", text: "I figured out the brass part myself." },
  { who: "angelo", text: "That's what I came to see. Not a speech. Just you, thinking it through." },
];

export const ANGELO_LEAVES_RIFT: DialogueLine[] = [
  { who: "angelo", text: "Angely, the next adventure is a world full of squishies." },
  { who: "angely", face: "happy", text: "Squishies? Like little bouncy blobs?" },
  { who: "angelo", text: "Soft, bright, and trickier than they look. Your stone arch leads there." },
  { who: "angely", face: "determined", text: "I'll bounce them all. Bye, Dad!" },
];
