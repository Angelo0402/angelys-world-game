# Pack ChatGPT — Más sprites para todos los bosses
**Fecha:** 2026-10-24 · **Orden de Angelo:** Final Boss (todas las fases) + Sandworm + resto, mismo estilo, mejor animación.
**Regla:** cada tira nueva pasa por GIF para aprobación ANTES de integrarse. Nada entra al juego sin que Angelo apruebe el GIF.

## Cómo usar este pack
1. Abre ChatGPT y adjunta la imagen de referencia del boss (carpeta `refs/`).
2. Pega el prompt de la tira que vas a generar, uno por mensaje.
3. Guarda cada tira como `boss_movimiento.png` y mándamela. Yo extraigo, hago el GIF y lo presento para aprobación.
4. Orden sugerido: Sovereign → Beast → Brute → Sandworm → Umbra → Sentinel (opcional).

## Referencias (adjuntar una por prompt)
- Sovereign caballero: `refs/` usa la tira existente `sov_knight_walk_ref.png` (8 cuadros de caminar).
- Beast (Crystal Beast): `refs/beast_idle.png`
- Brute (Broken Brute): `refs/brute_idle.png`
- Sandworm: `refs/sandworm_idle.png`
- Umbra: `refs/umbra_idle.png`

## Bloque de estilo (copiar en CADA prompt, después del texto del movimiento)
> Same character, same armor, same colors and same 2D game sprite style as the reference image. Full body in every frame, facing the same direction as the reference. All frames in a single horizontal row, left to right, in true animation order, evenly spaced, each frame cleanly separated. Solid pure flat black background, no gradient, no vignette, no glow on the background. No text, no scenery, no extra characters, no watermark.

## Plantilla por tira
> [MOVIMIENTO + descripción] — [N] frames. [BLOQUE DE ESTILO]

---

## BATCH 1 — Sovereign caballero (Final Boss, fase 3) — 24 tiras
Hoja actual `sovereign2` (394×300). Caminar 8→15. Todo lo demás 4→8.
NO generar `attack` por separado: en el código es alias de `claw`.

1. **walk, 15 frames:** complete walk cycle, strong forward motion, legs alternate wide apart with big strides, passing poses with legs crossing, feet lifting off the ground, every frame clearly different.
2. **idle, 8 frames:** subtle breathing idle, armor shifting slightly, cape swaying gently, red core pulsing, ready stance.
3. **claw, 8 frames:** arm draws back, then a fast horizontal claw swipe with crystal claws extended, follow-through, return to guard.
4. **slam, 8 frames:** both arms raise high overhead, then smash down to the ground, impact shake, recover.
5. **shoot, 8 frames:** arm extends forward, crystal projectile forms at the hand, fires forward, recoil, return.
6. **summon, 8 frames:** both arms rise, magic circles glow, minion energy rises from the ground, arms lower.
7. **charge, 8 frames:** crouch low gathering energy, then a fast forward rush with body leaning, stop into guard.
8. **erupt, 8 frames:** stomp the ground, crystal spikes erupt upward around him in sequence, settle back.
9. **hurt, 8 frames:** flinch backward from a hit, body recoils, armor flashes, shakes it off, back to guard.
10. **stagger, 8 frames:** heavy stumble backward, nearly loses balance, catches himself, steadies.
11. **enrage, 8 frames:** roar with head back, red core flares bright, aura bursts outward, fists clench.
12. **dead, 8 frames:** collapse sequence, knees buckle, falls to the ground, armor dims, lies still.
13. **rise, 8 frames:** rises from the ground, pushes up, stands tall, cape settles, ready stance.
14. **roar, 8 frames:** head tilts back, mouth open in a roar, chest out, cape blows back.
15. **beam, 8 frames:** core charges bright, then a thick beam fires forward from the chest, holds, fades.
16. **taunt, 8 frames:** mocking gesture, beckons the enemy closer, confident stance, cape sway.
17. **vanish, 8 frames:** body dissolves into purple crystal particles from feet upward until gone.
18. **appear, 8 frames:** crystal particles gather from the air down into solid form, cape settles.
19. **fan, 8 frames:** arm sweeps, fires a 5-shot fan of crystal projectiles spreading forward.
20. **shield, 8 frames:** raises a crystal barrier in front, barrier holds glowing, then lowers.
21. **leap, 8 frames:** crouch, high jump arc, airborne pose, landing crouch with impact.
22. **weak, 8 frames:** kneels down weakened, core flickers dim, struggles to stay up.
23. **laugh, 8 frames:** mocking laugh, head back, shoulders shaking, hand gestures.
24. **meteor, 8 frames:** raises both hands to the sky, rocks fall from above around him, arms lower.

## BATCH 2 — Beast (Final Boss, fase 1) — 18 tiras
Hoja actual `crystalveil` (456×354). Caminar 8→15. Ataques 4→8. Apuntes 3→6. Leap 1→6.
NO generar `attack` por separado: alias de `claw`.

1. **walk, 15 frames:** heavy beast walk cycle, powerful steps, body swaying with each step, claws swinging.
2. **idle, 8 frames:** beast breathing, muscles tensing, crystal spikes glowing faintly.
3. **claw, 8 frames:** foreleg draws back, fast claw swipe across, follow-through.
4. **slam, 8 frames:** rears up, both forelegs smash down, ground impact.
5. **shoot, 8 frames:** opens maw, crystal shot forms, fires forward.
6. **summon, 8 frames:** roars upward, minion crystals rise around it.
7. **charge, 8 frames:** lowers head, paws ground, fast forward charge.
8. **erupt, 8 frames:** stomps, crystal spikes erupt from the ground in a line.
9. **hurt, 8 frames:** flinch back, head shakes, recovers.
10. **stagger, 8 frames:** heavy stumble sideways, catches balance.
11. **enrage, 8 frames:** roars, spikes flare, body grows tenser.
12. **dead, 8 frames:** collapse, body falls, crystals dim.
13. **aim, 6 frames:** head locks onto target, body stills, eyes glow.
14. **sky, 6 frames:** looks up, fires shots upward into the sky.
15. **radial, 6 frames:** spins slightly, fires crystal shots in all directions.
16. **double, 6 frames:** two fast consecutive claw strikes, left then right.
17. **dash, 6 frames:** quick low dash forward, body stretched, stops hard.
18. **leap, 6 frames:** crouch, big leap arc through the air, landing impact.

## BATCH 3 — Brute (Final Boss, fase 2) — 18 tiras
Hoja actual `veil_form2` (349×319). Caminar 8→15. 4 cuadros→8. Apuntes 3→6. Shoot/summon/charge 2→6. Leap 1→6.
NO generar `attack` por separado: alias de `claw`. Brute = corona rota, core rojo agrietado expuesto.

1. **walk, 15 frames:** brute lumbering walk, heavy steps, broken crown tilting, arms swinging.
2. **idle, 8 frames:** heavy breathing, cracked core pulsing red, fists clenching.
3. **claw, 8 frames:** wide claw swipe with cracked-crystal arm.
4. **slam, 8 frames:** both fists overhead smash to the ground.
5. **hurt, 8 frames:** flinch, core flickers, recovers.
6. **stagger, 8 frames:** stumbles back, nearly falls, steadies.
7. **enrage, 8 frames:** roars, cracked core flares, aura burst.
8. **dead, 8 frames:** falls apart, body collapses, core dims.
9. **aim, 6 frames:** locks onto target, body stills.
10. **sky, 6 frames:** fires shots upward.
11. **radial, 6 frames:** radial burst of crystal shots.
12. **double, 6 frames:** two fast strikes in sequence.
13. **dash, 6 frames:** fast forward dash, low body.
14. **leap, 6 frames:** jump arc, heavy landing.
15. **shoot, 6 frames:** fires crystal shots from the cracked core arm.
16. **summon, 6 frames:** raises arms, minion crystals rise.
17. **charge, 6 frames:** crouches, then rushes forward.
18. **erupt, 6 frames:** ground crystal eruption around it.

## BATCH 4 — Sandworm — 5 tiras
Hoja actual `sandworm` (341×295). Es el más flaco (17 cuadros).

1. **spit, 6 frames:** rears back, mouth opens, spits a glob forward, mouth closes. (Hoy: 2.)
2. **dive, 6 frames:** body coils, burrows downward into the ground until gone. (Hoy: 2.)
3. **hurt, 4 frames:** recoils from a hit, body jerks back, recovers. (Hoy: 1.)
4. **rise, 8 frames:** emerges from the ground upward, coils rising, head up ready. (Hoy: 4.)
5. **idle, 12 frames:** coiled idle sway, head moving side to side, mouth twitching. (Hoy: 8.)

## BATCH 5 — Umbra + Sentinel (opcional, al final)
Umbra hoy: idle 6, cast 5, hurt 2, dead 4, taunt 3.
1. **umbra idle, 12 frames:** regal floating idle, gown swaying, magic drifting.
2. **umbra cast, 10 frames:** raises hand, spell circle forms, casts forward.
3. **umbra hurt, 6 frames:** flinch back, gown flares, recovers.
4. **umbra dead, 8 frames:** falls, gown collapses, magic fades.
5. **umbra taunt, 6 frames:** mocking gesture, head tilt, dismissive wave.
Sentinel ya es rico (83 cuadros): solo si sobra tiempo, walk 8→15 y hurt 8→12.

## Notas para ChatGPT (importantes)
- El Sovereign del juego es el CABALLERO de armadura, NO la reina. No cambiarlo a reina.
- Familia Final Boss: cristal negro/púrpura, brillo magenta, cores ROJOS.
- Cada tira: una sola fila horizontal, cuadros separados, fondo negro plano.
- Si una tira sale con menos cuadros de los pedidos, avisa y se regenera esa tira.
