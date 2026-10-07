export type Speaker = "umbra" | "angely" | "angelo" | "sovereign";

export interface DialogueLine {
  who: Speaker;
  text: string;
  /** Angely's portrait variant. */
  face?: "determined" | "surprised" | "happy";
  /** Voice clip key from manifest (e.g. "angely_01"). Played when the line shows. */
  voice?: string;
}

/** side: where the portrait sits in the subtitle box. */
export const SPEAKERS: Record<Speaker, { name: string; color: string; accent: number; side: "left" | "right"; portrait: (l: DialogueLine) => string | null }> = {
  umbra: { name: "Queen Umbra", color: "#e0b8ff", accent: 0xb57cff, side: "right", portrait: () => "portrait_umbra" },
  angelo: { name: "Angelo", color: "#8fc4ff", accent: 0x4f8dff, side: "right", portrait: () => "portrait_angelo" },
  sovereign: { name: "Veil Sovereign", color: "#c59bff", accent: 0x8a4fff, side: "right", portrait: () => null },
  angely: {
    name: "Angely",
    color: "#ffd36b",
    accent: 0xffd36b,
    side: "left",
    portrait: (l) => (l.face === "surprised" ? "portrait_angely_wow" : l.face === "happy" ? "portrait_angely_happy" : "portrait_angely"),
  },
};

export const UMBRA_INTRO: DialogueLine[] = [
  { who: "umbra", text: "So... the little light has finally found her way into my castle.", voice: "umbra_01" },
  { who: "umbra", text: "Angely. I have watched you cross my forest, my ruins, my volcano and my frozen peaks.", voice: "umbra_02" },
  { who: "angely", face: "surprised", text: "You were watching me the whole time?!", voice: "angely_01" },
  { who: "umbra", text: "Every step, Angely. Every enemy you stomped. Every portal you opened.", voice: "umbra_03" },
  { who: "angely", face: "determined", text: "Then you know why I'm here. You stole the light from every world, and I'm taking it back!", voice: "angely_02" },
  { who: "umbra", text: "Take it back? Foolish child. Every star in this sky belongs to Queen Umbra now.", voice: "umbra_04" },
  { who: "umbra", text: "Turn around, Angely. Go home... and forget the light ever existed.", voice: "umbra_05" },
  { who: "angely", face: "determined", text: "No way. My friends are counting on me. I'm not going anywhere!", voice: "angely_03" },
  { who: "umbra", text: "Then come, Angely! Let us see if your little heart shines brighter than my shadows!", voice: "umbra_06" },
];

export const UMBRA_PHASE2: DialogueLine = { who: "umbra", text: "Impossible! How are you still standing, Angely?! ENOUGH! Feel the full power of the night!", voice: "umbra_07" };

export const UMBRA_DEFEAT: DialogueLine[] = [
  { who: "umbra", text: "No... this light... it's so warm...", voice: "umbra_08" },
  { who: "umbra", text: "Angely... you are brighter than any shadow I have ever known.", voice: "umbra_09" },
  { who: "umbra", text: "The stars... the worlds... they are yours again. Take care of them, little light...", voice: "umbra_10" },
  { who: "angely", face: "happy", text: "Every world is free! Time to bring the light back home!", voice: "angely_04" },
];
