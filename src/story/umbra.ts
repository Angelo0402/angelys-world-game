export type Speaker = "umbra" | "angely" | "angelo";

export interface DialogueLine {
  who: Speaker;
  text: string;
  /** Angely's portrait variant. */
  face?: "determined" | "surprised" | "happy";
  /** Voice clip identifier for voice acting. */
  voice?: string;
}

/** side: where the portrait sits in the subtitle box. */
export const SPEAKERS: Record<Speaker, { name: string; color: string; accent: number; side: "left" | "right"; portrait: (l: DialogueLine) => string }> = {
  umbra: { name: "Queen Umbra", color: "#e0b8ff", accent: 0xb57cff, side: "right", portrait: () => "portrait_umbra" },
  angelo: { name: "Angelo", color: "#8fc4ff", accent: 0x4f8dff, side: "right", portrait: () => "portrait_angelo" },
  angely: {
    name: "Angely",
    color: "#ffd36b",
    accent: 0xffd36b,
    side: "left",
    portrait: (l) => (l.face === "surprised" ? "portrait_angely_wow" : l.face === "happy" ? "portrait_angely_happy" : "portrait_angely"),
  },
};

export const UMBRA_INTRO: DialogueLine[] = [
  { who: "umbra", text: "So... the little light found her way into my castle." },
  { who: "umbra", text: "Angely. I've watched you cross my forest, my ruins, my volcano, my frozen peaks." },
  { who: "angely", face: "surprised", text: "You were watching me the whole time?!" },
  { who: "umbra", text: "Every step, Angely. Every enemy you stomped. Every portal you opened." },
  { who: "angely", face: "determined", text: "Then you know why I'm here. You stole the light, and I'm taking it back!" },
  { who: "umbra", text: "Take it back? Foolish child. Every star in this sky belongs to me now." },
  { who: "umbra", text: "Turn around, Angely. Go home... and forget the light ever existed." },
  { who: "angely", face: "determined", text: "No way. My friends are counting on me. I'm not going anywhere!" },
  { who: "umbra", text: "Then come, Angely! Let's see if your heart shines brighter than my shadows!" },
];

export const UMBRA_PHASE2: DialogueLine = { who: "umbra", text: "Impossible! How are you still standing?! ENOUGH! Feel the night's full power!" };

export const UMBRA_DEFEAT: DialogueLine[] = [
  { who: "umbra", text: "No... this light... it's so warm..." },
  { who: "umbra", text: "Angely... you shine brighter than any shadow I have ever known." },
  { who: "umbra", text: "The stars... the worlds... they're yours again. Take care of them, little light..." },
  { who: "angely", face: "happy", text: "Every world is free! Time to bring the light back home!" },
];
