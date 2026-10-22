# RESKIN REPORT — Angely's World sprite reskin (2026-10-21)

Pipeline: generate from approved identity sheets → segment (threshold +
distance-watershed for merged blobs, or vertical band crops for clean
rows) → classify poses by eye → rebuild onto the EXACT runtime grid from
sprites.gen.ts (contour keying, never luminance alpha) → commit per
sheet. Backup of all pre-reskin sheets:
~/workspace/backups/angelys-world/sprites-pre-reskin-2026-10-21/

## INTEGRATED (new Angely design live in the build)

- **angely** (base) — integrated earlier today (parent session; v2
  contour-key fix for the faded look). Commit e462d73 / 50c8b84.
- **angely_sword** — INTEGRATED. First attempt could not be produced by
  the image tool; the retry with toy phrasing ("toy star sword, foam
  costume prop") succeeded. 19 poses found / 21 slots used (idle + hurt
  each take one closest-pose duplicate). Commit 6093dd0.
- **angely_bow** — INTEGRATED. First generation was an exploded
  body-parts collage (unusable); the wide-shot retry is excellent.
  5 poses / 5 slots, band-crop rebuild (224x222). Commit 278f958.
- **angely_boomerang** — INTEGRATED. 5 poses / 5 slots (aim, wind-up,
  throw, watch, catch), band-crop rebuild (220x224). Commit ea6d33c.
- **angely_wand** — INTEGRATED. 5 poses / 5 slots (concentrate, raise,
  swirl, cast burst, lower), band-crop rebuild (249x293); band cuts were
  recomputed from dense-body projections after the first pass caught
  slivers of neighbouring figures. Commit 9a93385.
- **angely_swim** — INTEGRATED. Generation mixed complete figures with
  close-up fragments: 33 components, 14 complete usable figures covering
  all 20 slots (float and up cycles repeat their clean poses).
  Center-anchored rebuild (190x287). Commit b1a9ae1.
- **angely_finale** — INTEGRATED. 30 pose components / 32 slots: idle,
  talk, reach and happy are exact; the walk and run cycles repeat their
  clean poses. Rebuild on 256x256 grid. Commit 0cd5efe.
- **angely_finale_back** — INTEGRATED. First generation was an exploded
  parts collage; the wide-shot retry is a clean 8-frame walk-away cycle
  from behind. 8 poses / 8 slots, band-crop rebuild (256x256).
  Commit 75808c2.

## COMPLETED LATER (2026-10-21, weapon-icon consistency pass)

- **angely_hammer** — INTEGRATED (commit 1819aba). Regenerated from the
  HUD icon: golden mallet with big purple gems, 5-pose smash sequence.
  Custom rebuild: uniform scale 0.37, feet-aligned, per-frame clamping
  so no frame bleeds into its neighbour.
- **angely_ray** — INTEGRATED (commit 1819aba). Regenerated from the
  HUD icon: teal barrel, gold rings, purple grip, pink gems. 5 poses
  mapped onto 6 slots (aim repeats as the last frame). Label-masked
  rebuild; the burst frame is clipped at the pose boundary so no
  neighbour hair leaks in.
- **angely_sword / angely_bow** — redrawn in the same pass to match
  their HUD icons (commits 4f4446f, 3768cfb). ALL 10 Angely sheets now
  carry the new design; every weapon sprite matches its HUD icon.
- Triple check: repo validator PASS (86 sheets / 324 anims / 1202
  frames); independent audit: exact grids, zero empty frames, Angelo
  revert byte-identical; browser QA: hammer + ray equip, animate and
  render at correct scale (frozen-frame screenshots).

## ANGELO — CANCELLED BY DIRECTOR (mid-run decision)

Angelo the character will not appear in gameplay at all (video
cutscenes only), so his redesign was cancelled after two sheets had
already been integrated:

- **angelo** — regenerated version committed as be00950, then REVERTED:
  runtime file restored from the pre-reskin backup. Commit bdda186
  ("Revert Angelo sheets — director keeps current Angelo design").
- **angelo_hug** — regenerated version committed as 8cbe796
  (pre-feedback), then also restored from backup in the same revert
  commit bdda186. The in-game hug scene is slated to be replaced by a
  video cutscene in a later phase.
- **angelo_finale / angelo_finale_back** — SKIPPED entirely per
  director; files never touched.
- **final_pair_reunion / final_pair_side / final_pair_back** —
  CANCELLED by director; never generated.

## FINAL BUILD

- tsc --noEmit: OK
- vite build: OK
- capacitor sync android: OK
- gradle assembleDebug (local, offline): **BUILD SUCCESSFUL**
- APK: ~/workspace/your_files/AngelysWorld-reskin-completo.apk
  (57,810,664 bytes ≈ 57.8 MB)
- Nothing pushed to GitHub. All work is in local commits on main.
