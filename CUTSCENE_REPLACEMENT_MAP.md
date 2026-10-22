# CUTSCENE REPLACEMENT MAP — Angely's World
## Every in-game subtitle-dialogue / portrait / Angelo scene, and the video that replaces it
### Prepared 2026-10-21 for Angelo's approval — NO code has been changed

**IMPLEMENTED 2026-10-21 (commits `1ca3637`, `365dd1a`, local only):** the
replacement is built. New `CutsceneScene` video player (cover-fit, tap-skip
after 1.2 s, real-time watchdog). Wired: intro_30s → level 1-1 first start
(save flag `introSeen`); 5-2 outro → `umbra_falls` + `dad_kiddo` videos;
8-2 intro → `worm_intro`; 8-2 outro → `angelo_praise` (toast fixed, no more
"Angelo took the blue gate"); 10-2 intro → `veil_intro`; 10-2 outro → finale
trilogy F1→F2→F3 → victory screen now reads **THE END**. All `say()` dialogue
removed from boss scenes; `angeloCutscene`/`angeloPraise` calls and the solo
walk-in staging retired. Minor beats (§4) decided: **voice-only barks** —
`hud:voice` event, no text, no pause. Videos in `public/assets/video/`,
CRF 28, 24 MB total. Browser-QA verified: play, skip, natural completion,
hand-back, save flag.
**GAPS:** the video tool refused two generations (no retry per policy) —
(1) 5-2 Umbra INTRO video: her entrance is silent in-engine staging for now;
(2) the Colossus fight clip ("Dad Arrives" middle of the script's 3-clip
arc): the outro plays Falls → Kiddo directly, Colossus beat skipped.
Angelo decides: accept, supply the clips himself, or revisit later.

**The ruling (Angelo, 2026-10-21):** Angelo the character must NOT appear in
gameplay at all. He exists ONLY in video cutscenes. ALL in-game subtitle
dialogue scenes are to be replaced by video cutscenes. Angely (new design)
is the only character seen in gameplay.

**Method:** every scene below was found by reading the actual code
(`src/ui/Dialogue.ts`, `src/scenes/GameScene.ts`, `src/scenes/HudScene.ts`,
`src/story/*.ts`, `src/entities/*.ts`). Note: there are no
`src/scenes/BossFight.ts` or `src/scenes/Finale.ts` files — all boss
sequences and the ending live inside `src/scenes/GameScene.ts`.

**Status key:**
- **EXISTING VIDEO** — a finished clip already covers this scene.
- **SCRIPT READY** — a written script/prompt exists; the video is not made.
- **TO PRODUCE** — no video and no video script yet (gap).
- **MINOR BEAT** — a single subtitle line over live combat; a video can't
  interrupt gameplay the same way, so these need a decision (see §4).

Durations are estimates from line counts (typewriter at 44 chars/s + voice
clips), not measured playthroughs.

---

## 1. THE SCENES — CHAPTER BY CHAPTER

### 1.0 Game opening — there is NO in-game intro scene today
- **Where:** Title → level 1-1 "Mushroom Meadow".
- **Today:** The game starts with no story scene at all — just the level
  tip toast and Angely's entry bark (`bark_entry_forest`). No dialogue, no
  Angelo.
- **Replacement:** Not a replacement — an ADDITION. The stitched
  **`intro_30s.mp4`** (EXISTING VIDEO: "The Guardian" + "The Last Light" +
  "She Walks", script and narration in `STORY_INTRO_ENDING.md`) would play
  before 1-1. Angelo appears in it — in video, which the ruling allows.
- **Code note:** No removal; a video hook would be added at game start.

### 1.1 Level 2-2 "Crumbling Halls" — Moonlit Warden (Ruin Sentinel)
- **Where:** `GameScene.sentinelIntro()` / `wardenOutro()`, entity
  `src/entities/RuinSentinel.ts`.
- **Today:** NO dialogue, NO subtitles, NO Angelo. The Sentinel rises, a
  name banner shows, fight; on defeat the portal opens directly with the
  banner "TO THE VOLCANIC CAVES!".
- **Replacement:** NONE NEEDED. Nothing to replace — already compliant.

### 1.2 Level 5-2 "Umbra's Throne" — Scene A: UMBRA_INTRO (boss intro)
- **Where:** `GameScene.bossIntro()` (generic boss path), triggered when
  Angely enters the arena.
- **Today:** Letterbox cinema mode. Queen Umbra's sprite drifts toward
  Angely for ~9 s while the dialogue box plays **UMBRA_INTRO** — 9 lines
  (Umbra ×6, Angely ×3), with portraits (`portrait_umbra`,
  `portrait_angely`/`_wow`) and full voice acting (`umbra_01–06`,
  `angely_01–03`). Angelo NOT present. ≈60–90 s.
- **Replacement:** **SCRIPT READY** — Act 1 of
  `BOSS_5-2_SCRIPT_PROMPT.md` contains this exact scene. Video not made.
- **Code note:** The dialogue beat inside `bossIntro()` would be bypassed;
  the boss-entrance staging (shade, roar, drift) either plays silently
  before the video or is cut with it.

### 1.3 Level 5-2 — Scene B: UMBRA_PHASE2 (mid-fight subtitle) — MINOR BEAT
- **Where:** `GameScene.onBossPhase2()`, emitted as `hud:subtitle`.
- **Today:** One subtitle line over live combat (no letterbox, no pause):
  Umbra — "Impossible! How are you still standing?!…" (`umbra_07` voice).
  Angelo NOT present.
- **Replacement:** **TO PRODUCE / decision needed** — see §4.

### 1.4 Level 5-2 — Scene C: UMBRA_DEFEAT (boss outro, part 1)
- **Where:** `GameScene.bossOutro()` (generic path), on Umbra's defeat.
- **Today:** Letterbox. **UMBRA_DEFEAT** — 4 lines (Umbra ×3, her
  redemption: "this light… it's so warm…", Angely ×1), portraits + voices
  (`umbra_08–10`, `angely_04`). The boss vanishes in a flash. Angelo NOT
  yet present. ≈30 s.
- **Replacement:** **SCRIPT READY** — in `BOSS_5-2_SCRIPT_PROMPT.md`.
  Two prototype clips also exist in `art/staging/`
  (`media-generation-witch-fall-cutscene-v2-…`,
  `media-generation-witch-fall-portal-escape-…`) covering the
  defeat→portal beats in the approved "Ruta A" direction, but they are
  prototypes, not the final video.
- **Code note:** The `say(UMBRA_DEFEAT)` beat in `bossOutro()` is bypassed.

### 1.5 Level 5-2 — Scene D: THE COLOSSUS + ANGELO CUTSCENE ★ (the big one)
- **Where:** `GameScene.bossOutro()` calls
  `angeloCutscene()` in `src/story/angeloScene.ts` immediately after
  Scene C. Scripts in `src/story/angelo.ts`.
- **Today (≈2.5–4 min, fully staged in-engine):**
  1. The Colossus (340 px golem) rises from the floor, shakes the arena.
  2. `COLOSSUS_APPEARS` (Angely, 1 line) + `COLOSSUS_SMASH` (Angely,
     1 line) — she is knocked back and calls for help.
  3. A blue rift opens (`BlueRift`, `src/story/BlueRift.ts`) and
     **ANGELO enters as a gameplay sprite** (`angelo` sheet).
     `ANGELO_ARRIVES` — "Hey! Get away from my daughter!" (portrait
     `portrait_angelo`, voice `angelo_01`).
  4. Scripted fight: Angelo runs, leaps, kicks, punches ×2 and uppercuts
     the Colossus until it falls (hit-stop, flashes, camera shake).
  5. `ANGELO_TALK` — 13 lines (Angelo ×8, Angely ×5; portraits + voices
     `angelo_02–07`, `angely_07–09`).
  6. `ANGELO_FAREWELL` — 4 lines ("Bye, Dad! I love you!" / "Love you
     too, kiddo."; voices `angelo_08–09`, `angely_10`).
  7. `reunionHug()` — both sprites hide, the shared `angelo_hug` sheet
     plays (open → hug → kiss → hold → pat) with floating hearts.
  8. Angelo walks back into the rift and vanishes; the Colossus rubble
     crumbles, clearing the exit portal. Banner: "TO THE SKY TOWER!".
- **Angelo present?** YES — sprite, portrait, voice, and the hug. This is
  the largest Angelo appearance in the game.
- **Replacement:** **SCRIPT READY** — `BOSS_5-2_SCRIPT_PROMPT.md` holds
  the complete scene (all dialogue, fight beats, and a 3-clip master
  prompt built from it). Video not made yet. This is the flagship
  replacement.
- **Code note:** `angeloCutscene()`, `reunionHug()` and `BlueRift` exist
  only for this scene (and §1.7); removing the scene removes their
  reason to run. The portal/banner flow after it stays.

### 1.6 Level 8-2 "Dune Worm" — Scene A: WORM_INTRO (boss intro)
- **Where:** `GameScene.wormIntro()`, script `WORM_INTRO` in
  `src/story/worm.ts`.
- **Today:** Letterbox. The worm rises; Angely alone speaks 2 lines
  ("The dune is moving!" / "Come on out. I'm not scared of you."),
  portrait + voices (`angely_16–17`). Angelo NOT present. ≈15 s.
- **Replacement:** **TO PRODUCE** — the lines exist in code, but no video
  script and no video exist for this scene. **GAP.**
- **Code note:** The `say(WORM_INTRO)` beat in `wormIntro()` is bypassed;
  worm rise + banner stay as silent staging or fold into the video.

### 1.7 Level 8-2 — Scene B: WORM_PHASE (mid-fight subtitle) — MINOR BEAT
- **Where:** `src/entities/Sandworm.ts` emits `hud:subtitle` with
  `WORM_PHASE[0]` when the worm changes phase.
- **Today:** One Angely subtitle line over combat ("It's going under!
  Watch the sand!", voice `angely_18`). No Angelo.
- **Replacement:** **TO PRODUCE / decision needed** — see §4.

### 1.8 Level 8-2 — Scene C: ANGELO PRAISE (worm outro) ★
- **Where:** `GameScene.wormOutro()` calls `angeloPraise()` in
  `src/story/angeloScene.ts`. Scripts in `src/story/worm.ts`.
- **Today (≈60–90 s):**
  1. A blue rift opens (`Rift` class in `angeloScene.ts`); **ANGELO
     enters as a gameplay sprite** and runs to Angely.
  2. `ANGELO_AFTER_WORM` — 6 lines (Angelo ×3, Angely ×3; portraits +
     voices `angelo_10–12`, `angely_19–20`).
  3. `reunionHug()` — the shared hug sequence again (hearts included).
  4. `ANGELO_LEAVES_RIFT` — 4 lines (Angelo ×2, Angely ×2; voices
     `angelo_13–14`, `angely_21–22`).
  5. Angelo walks back into the rift and vanishes. Portal opens; banner
     "TO THE SQUISHY VALLEY!" and a toast that even mentions him:
     "Angelo took the blue gate."
- **Angelo present?** YES — sprite, portrait, voice, hug.
- **Replacement:** **TO PRODUCE** — no script document and no video exist
  for this scene anywhere (it is not covered by
  `BOSS_5-2_SCRIPT_PROMPT.md` or `STORY_INTRO_ENDING.md`). **GAP — the
  biggest unscripted one.**
- **Code note:** `angeloPraise()` + the `Rift` usage here are bypassed;
  the toast text referencing Angelo is rewritten or dropped.

### 1.9 Level 10-2 "The Veil Crown" — Scene A: VEIL_TAUNT + VEIL_DECLARE (boss intro)
- **Where:** `GameScene.veilIntro()`, scripts in
  `src/story/crystalveil.ts`.
- **Today:** Letterbox. The Crystal Veil boss fades/slides in; the Veil
  Sovereign speaks 2 lines via the dialogue box — `VEIL_TAUNT`
  ("So, the little light crawls all the way to my veil…") and
  `VEIL_DECLARE` ("I am the Veil Sovereign… Kneel, child."), portrait
  `portrait_sovereign`, voices `sovereign_01–02`. Angely is silent.
  **Angelo NOT present** (removed in the 2026-10-20 regeneration).
  ≈20 s.
- **Replacement:** **TO PRODUCE** — the two lines exist in code; no video
  script and no video exist for this intro. **GAP (small).**
- **Code note:** The two `say()` beats in `veilIntro()` are bypassed.

### 1.10 Level 10-2 — Scene B: VEIL_PHASE2 / VEIL_PHASE3 (mid-fight subtitles) — MINOR BEATS
- **Where:** `GameScene.onBossPhase2()` (chapter 10 branch), emitted as
  `hud:subtitle`.
- **Today:** One Angely subtitle line per phase over live combat
  (`VEIL_PHASE2` at phase 2, `VEIL_PHASE3` at phase 3; voices
  `veil_angely_03–04`). No Angelo, no letterbox.
- **Replacement:** **TO PRODUCE / decision needed** — see §4.

### 1.11 Level 10-2 — Scene C: SOVEREIGN_RISE (form-3 transformation) — MINOR BEAT
- **Where:** `GameScene.onSovereignRise()`, called by
  `src/entities/CrystalVeilBoss.ts` when the crown breaks at 48 HP.
- **Today:** The fight freezes for a hit-stop beat, shockwaves fire, and
  the Sovereign's line plays as a subtitle + voice OVER the combat
  (`SOVEREIGN_RISE`: "You cracked my crown? Then feel the full shatter of
  the Veil!", `sovereign_03`); combat resumes 3.4 s later as the
  Sovereign form. No Angelo.
- **Replacement:** **TO PRODUCE / decision needed** — see §4. (This beat
  is mid-fight by design; a full video here would break the fight's
  flow, so it may be the strongest candidate to stay as voice+subtitle
  or to become a very short sting.)

### 1.12 Level 10-2 — Scene D: SOVEREIGN_FALL + THE SOLO ENDING (game ending)
- **Where:** `GameScene.veilOutro()` + `HudScene.showVictory()`.
- **Today (≈60 s, wordless after one line):**
  1. `SOVEREIGN_FALL` — 1 dialogue line ("The veil breaks, little
     light…", portrait `portrait_sovereign`, voice `sovereign_04`).
  2. A rift opens (the `Rift` class from `angeloScene.ts`). Angely's
     player sprite hides and the `angely_finale` sprite walks to the
     gate alone, turns her back (`angely_finale_back`), and recedes
     into it — no fade, no Angelo, no reunion.
  3. Save is marked cleared + `finaleSeen`; the HUD shows the
     **"TO BE CONTINUED..."** victory screen (`HudScene.ts` line 593).
- **Angelo present?** NO — not in the current build.
- **Replacement:** **EXISTING VIDEO** — the approved finale trilogy maps
  onto the NEW together ending Angelo directed (which supersedes this
  solo ending): **F1 "El Velo"** (the sky tears, stars pour back),
  **F2 "Los Mundos"** (every world relights), **F3 "Juntos"** (Angelo's
  rift opens, the hug, they leave hand-in-hand through the golden
  portal). Angelo appears in F3 — in video, exactly as the ruling
  intends. The ending screen text would become "THE END" instead of
  "TO BE CONTINUED...".
- **Code note:** `veilOutro()`'s dialogue line, the `Rift` +
  `angely_finale`/`angely_finale_back` walk-in staging, and the victory
  screen flow are the pieces this replacement retires.

---

## 2. ALREADY INACTIVE — the scrapped 10-2 cage/rescue version (dead code)
These exist in the repo but are **never triggered** in the current build.
No video is needed for them; they are listed so nothing is "found" later
and mistaken for a live scene.

- `src/entities/CageAngelo.ts` — Angelo trapped in a crystal cage
  (`angelo` sprite inside `crystal_cage_new`). **Never instantiated**
  anywhere; GameScene.ts comments at the veil intro/outro state the
  current design explicitly: "No cage, no Angelo."
- `src/story/crystalveil.ts` scripts **VEIL_INTRO, VEIL_DEFEAT,
  VEIL_RESCUE, VEIL_FAREWELL** — the old rescue dialogue (Angelo calling
  from the cage, the rescue, the farewell; voices `veil_angelo_01–07`,
  `veil_angely_01–07`). **Not imported by GameScene** — only VEIL_TAUNT,
  VEIL_DECLARE, VEIL_PHASE2, VEIL_PHASE3, SOVEREIGN_RISE and
  SOVEREIGN_FALL are wired.
- Decision for Angelo: delete the parked code, or leave it archived
  (it is already documented as reactivatable in the repo).

---

## 3. WHAT STAYS (not dialogue scenes — no replacement)
- **Angely's gameplay barks** (`src/audio/barks.ts`): short voice-only
  one-liners during play (entry lines per chapter, enemy sightings,
  reactions, low-HP, game over). No subtitles, no portraits, no Angelo.
  They are gameplay audio, not subtitle scenes.
- **Boss name banners** ("QUEEN UMBRA", "SAND WORM", "CRYSTAL VEIL"…),
  level tip toasts, portal banners ("TO THE SKY TOWER!") — UI text, not
  dialogue. (One exception to review: the worm-outro toast "Angelo took
  the blue gate." — see §1.8.)
- **The Moonlit Warden fight** (§1.1) — no dialogue at all.

---

## 4. THE MINOR BEATS — a decision Angelo needs to make
Four single-line subtitles play OVER live combat (§1.3 UMBRA_PHASE2,
§1.7 WORM_PHASE, §1.10 VEIL_PHASE2/PHASE3, §1.11 SOVEREIGN_RISE). A video
cannot replace them without stopping the fight. Options:
- **(a)** They stay as voice + subtitle (the only in-game text dialogue
  left), or
- **(b)** The voice line stays and the subtitle text is dropped, or
- **(c)** Each boss fight pauses at the phase change for a very short
  video sting (a few seconds) — most work, most cinematic.
They contain NO Angelo, so the "no Angelo in gameplay" half of the
ruling is satisfied either way.

---

## 5. SYSTEMS THE REPLACEMENT WOULD REMOVE / BYPASS (notes only)
- `src/ui/Dialogue.ts` — the whole letterbox dialogue + subtitle +
  portrait system (typewriter, SKIP, voice-per-line).
- `src/scenes/HudScene.ts` — the `hud:dialogue`, `hud:subtitle` and
  `hud:cinema` handlers that drive it.
- `src/story/angeloScene.ts` — `angeloCutscene()`, `angeloPraise()`,
  `reunionHug()`, and the `Rift` class (also used by the current solo
  ending).
- `src/story/BlueRift.ts` — used only by the 5-2 Angelo cutscene.
- `src/story/angelo.ts` + the Angelo/worm scripts in
  `src/story/worm.ts`, and the dialogue scripts in `src/story/umbra.ts`
  / `src/story/crystalveil.ts` (retired as their scenes are replaced).
- Portraits (Dialogue-only textures): `portrait_angelo`,
  `portrait_angely`, `portrait_angely_happy`, `portrait_angely_wow`,
  `portrait_umbra`, `portrait_sovereign`; speaker table `SPEAKERS` in
  `src/story/umbra.ts`.
- Story voice clips wired to dialogue lines: `angelo_01–21`,
  `angely_01–32` (story takes), `umbra_01–10`, `sovereign_01–04`,
  `veil_angelo_*`, `veil_angely_*` — gameplay barks use a separate set
  and stay.
- Trigger points in `src/scenes/GameScene.ts`: the `say()` beats in
  `bossIntro()`, `bossOutro()`, `wormIntro()`, `wormOutro()`,
  `veilIntro()`, `veilOutro()`; the `hud:subtitle` emits in
  `onBossPhase2()` / `onSovereignRise()`; the `hud:subtitle` emit in
  `src/entities/Sandworm.ts`.
- `src/entities/CageAngelo.ts` + cage sprite sheets — already inactive
  (§2); deleting them is cleanup, not a scene change.
- Save flag `finaleSeen` (`src/save.ts`) — its meaning changes if the
  ending becomes the F1–F3 video sequence.

---

## 6. SUMMARY TABLE

| # | Scene | Where | Angelo? | Replacement status |
|---|-------|-------|---------|--------------------|
| 1.0 | Game opening (addition, not a scene today) | Title → 1-1 | in video only | EXISTING VIDEO (`intro_30s.mp4`) |
| 1.1 | Moonlit Warden intro/outro | 2-2 | No | NONE NEEDED (no dialogue) |
| 1.2 | UMBRA_INTRO | 5-2 intro | No | SCRIPT READY |
| 1.3 | UMBRA_PHASE2 | 5-2 mid-fight | No | MINOR BEAT — decision (§4) |
| 1.4 | UMBRA_DEFEAT | 5-2 outro pt.1 | No | SCRIPT READY (+ prototypes) |
| 1.5 | Colossus + ANGELO cutscene ★ | 5-2 outro pt.2 | **YES — sprite + portrait + hug** | SCRIPT READY |
| 1.6 | WORM_INTRO | 8-2 intro | No | TO PRODUCE (gap) |
| 1.7 | WORM_PHASE | 8-2 mid-fight | No | MINOR BEAT — decision (§4) |
| 1.8 | ANGELO PRAISE ★ | 8-2 outro | **YES — sprite + portrait + hug** | TO PRODUCE (gap — biggest) |
| 1.9 | VEIL_TAUNT + VEIL_DECLARE | 10-2 intro | No | TO PRODUCE (gap — small) |
| 1.10 | VEIL_PHASE2 / PHASE3 | 10-2 mid-fight | No | MINOR BEAT — decision (§4) |
| 1.11 | SOVEREIGN_RISE | 10-2 transform | No | MINOR BEAT — decision (§4) |
| 1.12 | SOVEREIGN_FALL + solo ending | 10-2 ending | No | EXISTING VIDEO (F1+F2+F3) |

**Totals:** 11 in-game scenes/beats inventoried (plus 1 opening addition
and 1 no-dialogue boss).
- Map to **existing videos: 1** (the ending, §1.12) — plus the opening
  addition (§1.0).
- Map to **ready scripts: 3** (all of 5-2: §1.2, §1.4, §1.5).
- **Gaps — no script, no video: 3 scenes** (§1.6 WORM_INTRO, §1.8 ANGELO
  PRAISE, §1.9 Veil intro) **+ 4 minor combat beats** awaiting the §4
  decision (§1.3, §1.7, §1.10, §1.11).

### Angelo appearances to remove (active in the current build)
1. **5-2 `angeloCutscene()`** — Angelo sprite in gameplay, the scripted
   Colossus fight, ANGELO_TALK (8 of 13 lines), ANGELO_FAREWELL
   (3 of 4 lines), ANGELO_ARRIVES, and the reunion hug.
2. **8-2 `angeloPraise()`** — Angelo sprite in gameplay,
   ANGELO_AFTER_WORM (3 of 6 lines), ANGELO_LEAVES_RIFT (2 of 4 lines),
   and the reunion hug.
3. **`portrait_angelo`** — his face in every dialogue box he speaks in
   (Dialogue system / `SPEAKERS`).
4. **Text mention** — the 8-2 outro toast "Angelo took the blue gate."
5. *(Already inactive, listed for completeness:)* the caged Angelo in
   `CageAngelo.ts` and the cage-rescue scripts in `crystalveil.ts` —
   not in the current build; deletion is optional cleanup.

**Next step:** Angelo approves this map (and the §4 minor-beat decision),
then video production follows the priority: 5-2 trilogy (script ready) →
the ending is already shot → write/shoot the two gaps (8-2 praise first,
then worm intro + Veil intro) → wire videos in, scene by scene.
