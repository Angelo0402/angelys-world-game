import type { DialogueLine } from "./umbra";

export const WORM_NAME = "SAND WORM";

export const WORM_INTRO: DialogueLine[] = [
  { who: "angely", face: "surprised", text: "The dune is moving!", voice: "angely_16" },
  { who: "angely", face: "determined", text: "Come on out. I'm not scared of you.", voice: "angely_17" },
];

export const WORM_PHASE: DialogueLine[] = [
  { who: "angely", face: "determined", text: "It's going under! Watch the sand!", voice: "angely_18" },
];

export const ANGELO_AFTER_WORM: DialogueLine[] = [
  // angelo_10 is one recording covering script lines 1-2 ("...came out of
  // the sand and you met it") — wired to line 1; line 2 stays subtitle-only.
  { who: "angelo", text: "You didn't hide, Angely. That thing popped out of the sand,", voice: "angelo_10" },
  { who: "angelo", text: "and you faced it head on." },
  { who: "angely", face: "determined", text: "It kept diving. I had to watch the floor.", voice: "angely_19" },
  { who: "angelo", text: "And the Cog Saw! You used it right when the sword would've bounced off.", voice: "angelo_11" },
  { who: "angely", face: "happy", text: "I figured out the brass part myself.", voice: "angely_20" },
  { who: "angelo", text: "That's what I came to see. Not a speech. Just you, thinking it through.", voice: "angelo_12" },
];

export const ANGELO_LEAVES_RIFT: DialogueLine[] = [
  { who: "angelo", text: "Angely, the next adventure is a world full of squishies.", voice: "angelo_13" },
  { who: "angely", face: "happy", text: "Squishies? Like little bouncy blobs?", voice: "angely_21" },
  { who: "angelo", text: "Soft, bright, and trickier than they look. Your stone arch leads there.", voice: "angelo_14" },
  { who: "angely", face: "determined", text: "I'll bounce them all. Bye, Dad!", voice: "angely_22" },
];
