# Crystal Veil redesign — video family (Angelo decision 2026-10-22: ALL 3 forms)

Video look (veil_intro.mp4): black crystalline armor, deep purple sheen, magenta rim
light, GLOWING RED cracked core, red eyes, black smoke wisps. NO cyan/blue crystals
(the current sheets' blue family is retired for this boss).

## Form 3 — Veil Sovereign (in progress, sheet A generating)
Tall lean humanoid king: spiked crystal crown w/ red gem, red eyes, cracked red
star-core in chest, tattered black cape, clawed gauntlets. Sheet: sovereign2 layout
(224x224, 8 cols, 48 slots): idle/walk/claw/slam/shoot/summon/charge/erupt/
hurt/stagger/enrage/dead x4.

## Form 1 — Crystal Beast (pending Sovereign style approval)
Quadruped beast rebuilt in the family: black crystal rock body, purple/magenta
crystal spikes (NO blue), glowing red cracks + a red core gem in the chest,
red eyes. Sheet: crystalveil layout (384x384, 48 slots, same 12 anims x4).

## Form 2 — Broken Brute (pending)
Hulking humanoid brute of cracked black crystal: broken spiked crown, exposed
GLOWING RED cracked core in the chest (replaces the current black diamond hole),
massive clawed fists, smoke from the cracks. Sheet: veil_form2 layout (352x352,
20 slots: idle 0-4, walk 5-9, claw 10-12, slam 12-14 shared, hurt/stagger 15,
dead 16-19; code aliases shoot/summon/charge/erupt/enrage onto these).

Rules (learned the hard way): poses complete inside the sheet with margin,
nothing touching edges; verify edge profiles + components numerically after
processing; Angelo approves strips before integration.

## Angelo addendum 2026-10-22 05:38: boss is SPECIAL
- MANY animations: beyond the 12 standard, add Sovereign specials: RISE (rises
  from the throne), ROAR/TAUNT, extended DEATH collapse. More frames on key
  anims (Angely frame-expansion precedent).
- EPIC CUTSCENE requested — scope question asked (intro / death-finale / both).

## Angelo decisions 2026-10-22 05:46: BOTH epic cutscenes, WITH VOICES
- Epic intro cutscene (boss entrance) AND epic death/finale cutscene.
- WITH VOICE acting — current cutscenes are silent; Angelo explicitly flagged
  "las q tiene no tienen sonido ni nada". New ones carry voices (Sovereign,
  narration, Angely per script).

## Sovereign sheets COMPLETE 2026-10-22: A idle/walk/claw/slam, B shoot/
summon/charge/erupt, C hurt/stagger/enrage/dead, D rise/roar/beam/taunt,
E vanish/appear/fan/shield, F leap/weak/laugh/meteor — 96 poses, 24 anims.
Raws: art/staging/veil_refs/sovereign{A..F}_raw.png. Assembly notes: zone
extractions carry neighbor FX bleed at some edges (rows overlap slightly in
C/E/F) — final assembly uses global components + hand windows per pose,
Angely-standard numeric verification. New sovereign2 layout: cells 384x288,
more slots (24 anims x 4 = 96) — gen + CrystalVeilBoss wiring updated at
integration (new anims wired: rise at transform, teleport/fan/shield/leap/
meteor/beam/roar/taunt/laugh/weak as moves per boss design).

## Angelo catch 2026-10-22 06:01: "observa las esquina" — zone-cut previews
carried neighbor FX bleed (roar shards, beam chunk, cape tips in corners).
FIXED same morning: ownership extraction (tools/sprite_pipeline/
extract_owned.py) — every component belongs to exactly one pose (nearest
body by bbox distance). All 6 Sovereign sheets re-extracted; corners clean.
RULE: previews shown to Angelo must be post-cleanup, never raw zone cuts.
Note: beam 2's ray is genuinely long — final sheet cells sized to content.

## Angelo 2026-10-22 06:15: EPIC SCENE — different enemies + 3 HP bars
Current state (verified in code): ONE 460px purple bar (HudScene.buildBossBar,
registry {name,hp,max}); summons = generic enemies by phase (P1 skeleton+
firebat, P2 firebat+lavablob, P3 mix), cap 3 alive, ~17s cadence
(GameScene.spawnVeilWave).
DESIGN:
- 3 PHASE BARS in the boss panel, widths proportional to phase HP
  (Beast 64 / Brute 48 / Sovereign 48 of the 160 pool -> ~184/138/138 px):
  Beast bar MAGENTA, Brute bar VIOLET with red core glow, Sovereign bar RED.
  Boss name text switches per form. Active bar pulses; a finished bar stays
  dark + cracked; phase change = white shatter flash + panel shake on the
  completed segment (reuse bossChip damage-lag per segment).
- PHASE MINIONS (replace generic waves, same cap/cadence skeleton):
  P1 Beast -> CRYSTAL IMPS (fast, low HP, hop toward player; art from the
  beast summon portals). P2 Brute -> CRYSTAL GOLEMS (slow, tanky, from the
  sovereign summon art). P3 Sovereign -> imps + golems mixed, cadence 14s.
  Needs 2 new small enemy sheets + ENEMY_TYPES entries + spawnVeilWave comp.
- Epic cutscene wiring points confirmed: intro plays at veilIntro()
  (playCutscene(["veil_intro"]) -> epic pair), outro at veilOutro()
  (finale trilogy -> epic trio).
