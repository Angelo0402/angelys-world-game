# EPIC CUTSCENES — Veil Sovereign (Angelo 2026-10-22: BOTH, WITH VOICES)
Current cutscenes are SILENT (no voice, no music) — Angelo: "no tienen sonido
ni nada". Both epics ship with voice + music/SFX mixed into the mp4.

## EPIC INTRO — replaces veil_intro.mp4 at 10-2 start (2 clips x 10s)
CLIP 1 "He Rises": throne hall (match veil_intro_a). The Sovereign seated;
crystals tremble; he RISES slowly; black smoke pours; the red core ignites.
Audio: dark orchestral swell + crystal rumble. No voice.
CLIP 2 "Kneel": Angely enters, light glowing in her chest; the Sovereign
stands over her and POINTS (match veil_intro_b). VOICES (already recorded,
transcription-verified, $0 new):
  - sovereign_01: "So, the little light crawls all the way to my veil.
    How persistent." (over his point)
  - sovereign_02: "I am the Veil Sovereign. Every crystal here bows to me.
    Kneel, child." (closing beat, core flares)

## EPIC FINALE — replaces finale trilogy at 10-2 outro (3 clips x 10s)
Directed ending per STORY_INTRO_ENDING.md (approved canon).
CLIP F1 "The Veil Tears": the Sovereign falls to his knees; crown cracks;
core flickers out; the Veil TEARS like a curtain; stars rain back.
  VOICE: sovereign_04: "The veil breaks, little light... The crystals were
  never mine to keep." (recorded, $0 new)
CLIP F2 "Every World Again": montage — forest relights, volcano glows, ice
peaks shine, sea reflects the stars. Music swell only.
CLIP F3 "Together": blue rift opens in the lit arena; Angelo runs out;
THE HUG; the great golden portal opens; hand in hand they walk in together;
worlds shining behind. Fade to white -> THE END.
  VOICE: veil_angelo_04: "That's my girl. I knew you'd find me." (recorded,
  over the hug, $0 new). Portal walk: music only.

## MIXING
ffmpeg: voice lines at timed offsets over a music bed (game BGM inventory)
at low volume; normalize; mux into each mp4 (replaces silent tracks).
Wiring: CutsceneScene already plays mp4s — swap file lists for 10-2 intro
(intro epic x2) and outro (finale epic x3); keep skip behavior.

## NOT in scope (per earlier refusal rule): Umbra intro video, Colossus
fight clip — untouched.
