# Boss walk-cycle expansion — generation prompts (prepared 2026-10-22)

Angelo (2026-10-22 09:45): the final boss barely moves — every anim is 4 frames.
Fix: NEW 12-pose walk cycle per form (36 poses), refs = current idle+walk strips
in `walk_refs/`. Dispatch order: after Angely run/jump generations return.
Each: fresh ChatGPT chat, upload that form's walkref strip, prompt verbatim.

SHARED RULES for all three: EXACT SAME character as the reference strip, do not
redesign. Fully transparent background, no scenery/floor/shadow/text/labels.
12 separate poses in one image, 4x3 grid, generous space, poses NOT touching
or overlapping, nothing touching the image edges. Side view, facing RIGHT,
same facing as the references. The body size, head height and ground line must
be IDENTICAL in all 12 poses; only the legs/arms/tail move. The cycle must
loop: pose 12 flows back into pose 1.

## 1 — Crystal Beast (quadruped, ref crystalveil_walkref.png)
CHARACTER: quadruped beast of black crystal rock, purple/magenta crystal
spikes along the spine (NO blue), glowing red cracks, a glowing red core gem
in the chest, red eyes, long spiked crystal tail, black smoke wisps.
THE 12 POSES — a heavy prowling walk, diagonal gait, in this order:
1. Front-right paw planted forward, rear-left paw planted back, body level.
2. Front-right paw bears weight, rear-left pushes off, front-left leg swings forward.
3. Front-left paw lands forward, rear-right leg swings forward under the body.
4. Front-left bears weight, rear-right plants back, body dips slightly.
5. Rear-right pushes off, front-right leg swings forward.
6. Front-right lands forward again (half-cycle), tail swaying opposite.
7-12. Repeat poses 1-6 as the second half of the stride with tiny natural
variation in head height and tail curve, so all 12 loop smoothly.
Legs must move a LOT between poses — big clear steps, paws lifting high off
the ground at swing phases. A walking cycle where every leg position is
visibly different.

## 2 — Broken Brute (ref veil_form2_walkref.png)
CHARACTER: hulking humanoid brute of cracked black crystal, broken spiked
crown, exposed GLOWING RED cracked core in the chest, massive clawed fists,
purple/magenta crystal shards on the shoulders, smoke rising from the cracks.
THE 12 POSES — a heavy stomping walk, knuckle-dragging, in this order:
1. Right foot planted forward, left fist knuckles near the ground, body leaning right.
2. Right foot bears full weight, body at its lowest, left leg swinging forward.
3. Left foot stomps down forward, right fist swings back.
4. Left foot bears weight, right leg dragging forward, knuckles scraping.
5. Right foot stomps down forward, left fist swings back, body leaning left.
6. Right foot bears weight, left leg swinging (half-cycle).
7-12. Repeat poses 1-6 as the second half with tiny variation in shoulder
roll and smoke, so all 12 loop smoothly.
Big clear steps: feet lift visibly, fists swing wide, shoulders roll with
each step. Every pose must be visibly different.

## 3 — Veil Sovereign (ref sovereign2_walkref.png)
CHARACTER: tall lean humanoid crystal king, spiked crystal crown with a red
gem, red eyes, cracked red star-core glowing in the chest, tattered black
cape, clawed gauntlets, black crystal armor with purple/magenta sheen.
THE 12 POSES — a slow regal gliding stride, menacing and smooth, in this order:
1. Right foot steps forward, cape trailing behind, left arm hanging with claws open.
2. Right foot bears weight, body rises slightly, left leg gliding forward.
3. Left foot lands forward, right arm swinging gently back, cape swaying.
4. Left foot bears weight, body tall, right leg gliding forward.
5. Right foot lands forward (half-cycle), chin high, crown glinting.
6. Right foot bears weight, left leg gliding forward, cape billowing softly.
7-12. Repeat poses 1-6 as the second half with tiny variation in cape flow
and arm swing, so all 12 loop smoothly.
Steps must be LONG and clear — legs visibly stride, feet lift and land in
different positions every pose, cape flows opposite the stride.
