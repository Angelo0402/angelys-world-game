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

## NEW LINES + REMIX (Angelo 2026-10-22 06:52)
Angelo: music too loud, voice too low in both epics; write BETTER lines.
Remix targets: bed ~-9 dB vs current mix, voices +4 dB (limiter -3 dB kept).
New Sovereign lines (same voice as sovereign_01-04, beats unchanged):
  - sovereign_01 (taunt): "So... the little light crawls all the way to my
    veil. I have crushed a thousand lights brighter than yours."
  - sovereign_02 (declare): "I am the Veil Sovereign! Every crystal in the
    dark sings my name. Kneel, child — and I will make your end quick."
  - sovereign_03 (rise): "You cracked my crown?! Then drown in the shattering
    of the Veil itself!"
  - sovereign_04 (fall): "The veil... breaks... Take back your stars, little
    light. They were never mine to keep."
veil_angelo_04 UNCHANGED: "That's my girl. I knew you'd find me."
After recording: transcribe-verify, swap audio files, remix both epics with
the new levels, re-deliver for Angelo's verdict.

## DONE 2026-10-22 07:1x — new lines recorded + remixed
Voice identified from ElevenLabs history: "Edward - British, Dark,
Seductive, Low", Eleven v4, stability 50 (the Sovereign's original voice).
Credits: 2,014 -> 1,637 (377 spent: 107+112+71+87 chars). All 4 new lines
transcription-verified (faster-whisper tiny; content exact). Installed as
public/assets/audio/sovereign_01..04.mp3 (old takes backed up in
epic/old_lines/); crystalveil.ts texts updated to match.
REMIX v2 (Angelo: music too loud, voice too low): beds at 0.32 (was 0.85),
voices loudnorm I=-14. Measured intro: bed-only window RMS -26.5 dB vs
voice window -17.5 dB -> voice ~9 dB over the music. Intro retimed for the
longer lines: 01 @8.5s, 02 @16.8s; video extended 22.5 -> 27.5s (freeze
tail of the face-off clip 2.5 -> 7.5s). Finale: 04 @1.5s, angelo_04 @21.5s,
30s unchanged. Files: veil_epic_intro_v2.mp4 / veil_epic_finale_v2.mp4 in
epic/, installed over public/assets/video/.
