# Sprite Size Audit — 2026-10-22

Requested by Angelo: verify the size of ALL sprites and that they are within spec.
Method: every entry in `src/assets/sprites.gen.ts` (159 = 89 animated sheets + 70 props).
Content measured per referenced frame from the actual .webp pixels (alpha ≥ 110 bbox).
Raw data: `/tmp/sprite_audit.json` (script `/tmp/sprite_audit.py`).

## The spec

1. Sheet ≤ 4096 px per dimension (mobile GPU black-box rule).
2. Image dimensions exactly divisible by declared frame size; anims never reference frames outside the grid.
3. No referenced frame empty.
4. originY = the sheet's own feet fraction (ground sheets).
5. Character scale consistency: the `h` that drives `scaleForHeight` must equal the measured content height, or the character renders at the wrong size.
6. No pose ballooning: an animation's content should not be dramatically wider/taller than the sheet's idle (that's the "se ve muy grande" defect).

## Hard spec results

| Check | Result |
|---|---|
| Over 4096 px | NONE — all 159 within limit (max: final_portal exactly 4096 wide) |
| Missing files | NONE |
| Grid misalignment | NONE |
| Frame overrun | NONE |
| Empty referenced frames | NONE |
| Origin ≠ feet | 1 — `angely_finale` (originY 0.801 vs feet 0.994; story-scene sheet, placement is hand-tuned — metadata stale, no confirmed visual defect) |

Crystal Veil epic package (`crystalveil`, `veil_form2`, `sovereign2`, `crystal_imp`, `crystal_golem`): **ALL CLEAN** on every check.

## LIVE size errors — characters rendering bigger than their design size

`scaleForHeight(sheet, target, "idle") = target / gen_h`. When gen_h < real content height, the sprite renders oversized by content/gen_h:

| Sheet | Used for | gen h | Real content | Renders |
|---|---|---|---|---|
| `sentinel` | Ruin Sentinel boss | 200 | 248–256 | **+24–28% too big** |
| `heart` (glow) | hearts / HUD hearts | 68 | 89 | **+31% too big** |
| `crystalveil_fx` (spikes) | boss ground spikes | 42 | 53 | **+26% too big** |
| `crystal_shot` (fly) | boss projectiles | 67 | 75 | +12% too big |
| `toxic` | enemy | 188 | 209 | +11% too big |
| `angely` (idle) | Angely (all sheets) | 243 | 250 | +3% (negligible) |

Fix (needs Angelo's OK — it changes on-screen sizes): set gen `h` to the measured content height for those anims. Sprites then render at exactly their design size.

## Sentinel clipping

`sentinel` content touches the left/right cell edge in 29 frames and the top edge in 22 frames; content height = the full 256 cell. The art itself is bigger than its frame — poses are likely cropped at the edges. Needs re-extraction or a rebuilt sheet; the gen-h fix alone won't un-crop it.

## Angely ballooning (fix already in production — new run/jump sheets generating)

Idle content width 113 px. Current widths: run 200 (1.8×), jump 206 (1.8×), air 238 (2.1×), fall 280 (2.5×), defeat 294 (2.6×), push 272 (2.4×). New sheets are specced compact (poses ≤ ~1.4× idle width).

## Metadata drift (not live bugs)

Many legacy sheets carry gen `h` values below measured content on NON-idle anims (hurt/dead/attack). Those `h` values drive no scale today, and most height drift on hurt/dead is intentional animation (collapse/squash). Extreme cases noted for a future pass: `thunderimp` attack +49%, `stormbird` dead +36%, `anglerfish` dead +33%, `angely_sword` defeat −46% (lying down — expected), `angely_wand` cast content 283 vs gen 218 (metadata only; player scale comes from `angely` idle).

## Verdict

Within hard spec: YES except the stale `angely_finale` metadata. Within size spec at runtime: NO for the 5 sheets in the live table — they render 11–31% oversized. Boss epic package: fully within spec.
