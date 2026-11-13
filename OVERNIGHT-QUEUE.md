# Cola diaria — Angely's World (loop 3× al día desde 2026-11-13)

El loop toma el PRIMER item de esta lista en cada corrida, lo hace, lo verifica y deja el APK + reporte. Un item por corrida. Cuando un item se termina, se marca [x] con fecha y se pasa al siguiente. ANTES de la cola, cada corrida hace un SWEEP: caza UN bug nuevo o una mejora concreta del juego y lo propone con GIF para veredicto de Angelo — nada se integra sin su aprobado.

## Reglas del loop (fijas)

- Dos carriles por noche: (1) código — se arregla, se verifica y sale en el APK de la mañana; (2) sprites — se PREPARAN de noche (generar, extraer, limpiar, GIFs), se integran SOLO después de que Angelo apruebe el GIF en la mañana.
- Nada de sprites ni arte nuevo (eso necesita GIF + ojos de Angelo).
- No decide preguntas abiertas (torre 3 vs 4, colores de Umbra, música, diamantes).
- Si el build falla, para. Revierte al último árbol bueno. Reporta. Nunca manda un APK roto.
- Máx 3 intentos de arreglo por item. Si no sale, vuelve a Angelo.
- Commit local cada noche con mensaje claro. NO push a GitHub sin que Angelo lo pida.
- Verificación nocturna: tsc 0 errores, vite build limpio, APK con tamaño en MB + MD5 + ZIP OK, y el fix presente en el bundle. Sin screenshots del harness (WebGL muerto en la VM desde 2026-11-07) y sin prueba de teléfono (esa es de Angelo en la mañana).

## Carril de sprites (reglas)

- De noche: generar el strip candidato (ChatGPT por navegador), extraer, despill → unsharp → despill, contact sheet con revisión, GIF comparativo a fps real del juego.
- En la mañana: los GIFs van al chat para veredicto de Angelo. SIN su "aprobado" no se integra nada.
- Noche siguiente: se integran solo los strips aprobados, se rebuild, se verifica y sale en el APK.
- Fondo TRANSPARENTE, nunca verde (regla de oro de Angelo 2026-11-08: con verde el recorte queda feo). Caveat honesto: la transparencia de ChatGPT falla a veces (blanco o tablero pintado); si el alpha no es real, se vuelve a verde + despill.
- Angely: siempre desde poses de maniquí + sprites viejos aprobados + THE LITTLE LIGHT. Nunca regenerar desde cero.
- Si ChatGPT falla o la sesión se cae de noche, el loop lo reporta y sigue con código. Nunca inventa un strip.

## Cola de features (nueva, Angelo 2026-11-13, voz — cron aparte 2× al día, `game-features-twice-daily`)
- Cada corrida del cron de features toma el PRIMER item, lo prepara como PRUEBA con un GIF esquemático distinto (como el GIF de la gema 9-2), y ESPERA el veredicto/prueba de Angelo. Nada se integra sin que él diga que pasó la prueba.
- F1. Efectos Graveyard (cap. 11): niebla, glow, polvo, luces — solo efectos Phaser por código, sin sprites nuevos.
- F2. Entorno destructible: bloques que se rompen (tilemap removeTileAt + partículas de escombro).
- F3. Efecto visible de estrella en Star Shield (ver item 5 abajo).
- F4. Barra/dial de volumen de música en el menú (ver item 3 abajo).
- F5. Música distinta por capítulo: hoy la música es procedural (AudioManager SONGS, sin archivos) y se repite — ch5, ch10 y ch11 usan la misma `music_shadow`. Angelo 2026-11-13: "no escucho música nueva".
- F6. Portal que se abre por coleccionar, no solo por matar enemigos (regla Graveyard; ejemplo de Angelo pendiente — su frase quedó cortada).

## Capítulo 11 Graveyard — spec (Angelo 2026-11-13, voz; su character sheet nuevo llega primero)
- Bonus después del 10-2, desde level select. NO igual que los otros niveles.
- LARGO: 3× la longitud normal. Estirar los niveles, no puede ser muy corto.
- Graves (tumbas) y zombies que salen del ataúd.
- Underground LITERAL (no un phase): flecha hacia abajo, rompes el piso con el martillo y entras por el mismo roto que acabas de romper. Abajo hay más enemigos: esqueletos, zombies, murciélagos.
- Murciélagos: cada uno con sus strikes y sus efectos. Efectos primero con código/herramientas guardadas (pixelfx, 4-layer VFX) — NO depender 100% de ChatGPT. ChatGPT solo si algo que él manda no le gusta.
- Portal: NO solo por matar enemigos. Se puede abrir si consigues algo (ejemplo pendiente de Angelo).
- Sonido del corazón / heal APROBADO por Angelo 2026-11-13 ("me gustó"): arpegio B2 (sine G4→C5→E5) + healBurst de pluses mint (v80, sigue a Angely en v81). No tocar.
- Su character sheet nuevo (lo pide a ChatGPT) es oro y va PRIMERO en cada pedido de sprite de Angely, junto con todas las hojas originales.

## Cola

### 1. [x] Limpieza de código muerto — HECHO 2026-11-09 (v71)
- Quitar la definición `special_v3` sin uso y el sheet `special_v3.webp` (1.5 MB, no se usa desde v69).
- Quitar campos muertos que quedaron de los intentos del especial (revisar `playerDefeatAnimated` y similares).
- Verificar: tsc 0, build limpio, APK arranca igual, tamaño baja ~1.5 MB.
- Estado: [x] terminado 2026-11-09 (v71, versionCode 35). Quitado `special_v3` de sprites.gen.ts + borrado special_v3.webp (1.5 MB). tsc 0, vite limpio, APK 205.0 MB (v70 206.5 MB), MD5 6eda091da9fae8b6099251055b8db7c6, ZIP OK. APK: ~/workspace/your_files/AngelysWorld-v71-TEST.apk. Commit local 0edf015 (sin push).

### 2. Sprites — carril de preparación (Angelo pidió incluirlo 2026-11-08 21:56)
- Candidato #1 CONFIRMADO por Angelo (tap 21:58): overhaul completo del jefe final (Crystal Beast + Broken Brute, 10-2). Recrear todo, muchísimos más frames, fondo transparente.
- **Referencia aclarada por Angelo 2026-11-08 21:59: las "páginas web" son los MANIQUÍS — las poses Shisei (https://shisei.indaloop.app/en/).** Pose = maniquí Shisei; look = los sheets actuales del jefe final en el repo. Catálogo local: `~/workspace/shisei-catalog.json`; poses en disco: `~/workspace/yeti-v2/poses/` (solo vistas laterales).
- La noche genera y prepara; la mañana Angelo aprueba los GIFs; la noche siguiente se integra lo aprobado.
- Idle Crystal Beast candidato 1 (10 frames, transparente): APROBADO por Angelo 2026-11-09 02:45 ("Me gusta"). **INTEGRADO 2026-11-09 ~03:00 en v72 (versionCode 36, commit 6429416, APK 205.3 MB) — NO repetir en la noche 2.** Noche 2: preparar el SIGUIENTE movimiento del overhaul, no el idle.
- **ALCANCE ACTUALIZADO por Angelo en la llamada 2026-11-09 ~02:49: overhaul TOTAL, no solo idle.**
  - **Muchos frames por movimiento** — cada movimiento tiene que sentirse con mucho movimiento. El jefe final tiene que ser algo especial.
  - **NO garra/slash cuerpo a cuerpo** — Angelo no se acerca tanto al boss en el juego. Nada de ataques melee.
  - **Ataques = sprites NUEVOS con EFECTOS nuevos.** Todos los ataques llevan efectos nuevos.
  - **Proyectiles con muchos frames, dando vueltas** (spinning) — el proyectil tiene que verse girando, con muchos frames.
  - **VIDEOS PROHIBIDOS por ahora** — Angelo hace él mismo el video épico de Angely y el jefe; él envía una imagen de referencia. El loop NO toca videos.
- Estado: activo. Primera noche de preparación: 2026-11-09 ~02:00.
  - Noche 2026-11-09: candidato #1 listo — Crystal Beast IDLE, 10 frames, fondo transparente REAL (verificado por canal alfa: 71.7% transparente), ChatGPT. GIFs para veredicto: crystal_beast_idle_candidate1.gif + compare_old_vs_new_idle.gif + contact_sheet.png en ~/workspace/goals/angely-s-world-game/hidden_files/overnight-loop/final-boss/. NOTA: estilo más detallado/texturizado que el flat del sheet actual; idle sutil (respiración). APROBADO 2026-11-09 02:45 — integración en curso (v72).
  - Siguiente: ataque del jefe final (proyectil giratorio con muchos frames + efectos nuevos) — EN CURSO desde la mañana 2026-11-09, Angelo dijo "empezaremos ahora". PROYECTIL: candidato 1 (12 fr, gira 360°, transparente real 89.1%) — APROBADO por Angelo 2026-11-09 ~09:38 (voz) + efecto del wand INTEGRADO EN v73 el mismo día (ver línea siguiente). ATAQUE: candidato 3 (12 fr, windup→gather→release→recoil; figuras venían 2x grandes vs idle, escaladas uniformemente x0.478; frames 7-8 llevan una astilla mínima del corte del glow) — RECHAZADO por Angelo 2026-11-09 06:24 ("No me gusta"); razón aún sin responder (se le preguntó: movimiento / look / tamaño / bola). Candidatos 1 y 2 del ataque DESCARTADOS (figuras pegadas por el glow). Nada integrado sin su aprobado.
  - ATAQUE — RECHAZADO. Estado 2026-11-09 06:24 + llamada ~09:38: candidato 3 RECHAZADO por Angelo ("No me gusta"); en la llamada dijo en general "no me gustaron los sprites". Razón específica (movimiento / look / tamaño / bola) AÚN SIN RESPONDER — preguntado 06:2x, sin respuesta. NO regenerar a ciegas: el reintento debe pegarse al look del IDLE APROBADO (ancla de estilo). Reintento PREPARADO en `attack/prompt_attack_v2.md` (mismo 12f, guardas de estilo flat + proyectil aprobado como segundo ancla de look) — el PADRE debe lanzar la generación en ChatGPT; un subagente genérico NO puede. GIF solo para veredicto, NADA se integra sin su aprobado.
  - PROYECTIL — APROBADO + INTEGRADO EN v73, HECHO AHORA (no esta noche) por orden de Angelo en la llamada 2026-11-09 ~09:38. Candidato 1 (12f, giro 360°, transparente real 89.1%) APROBADO en la llamada. Efecto del wand integrado en código Phaser: estela de partículas magenta `dot` que SIGUE al proyectil (mismo patrón `follow` de las estrellas doradas del especial v70) + afterimages magenta 0xff78cf del boss. Nada estacionario (bug v69). Sheet nuevo `crystal_shot.webp` 4x4 (fly 0-11, form 0-2, impact 12-15 burst magenta sintetizado); hitbox igual que antes; impact fx x1.8. v73: 205.7 MB, versionCode 37, commit local 81cbef1, APK `~/workspace/your_files/AngelysWorld-v73-TEST.apk`. Verificado: tsc 0, vite limpio, bundle con wandFx + trail + fly 0-11; GIFs del loop e impacto en `attack/new_shot_fly.gif` / `new_shot_impact.gif`. NO verificado visualmente en juego (harness WebGL muerto) — veredicto en el teléfono de Angelo.
  - NOCHE 2026-11-11 → 2026-11-12 (decisión de Angelo 2026-11-11 22:11, tap "El walk esta noche"): el carril de sprites prepara el WALK del Crystal Beast (slots 10–17, 8f actuales) — siguiente movimiento del overhaul. El ATAQUE sigue BLOQUEADO esperando su idea (no regenerar a ciegas). Walk: mismo ancla de estilo que el idle APROBADO, fondo transparente, poses maniquí Shisei, muchos frames por movimiento. GIFs para veredicto en la mañana; NADA se integra sin su aprobado.
  - NOCHE 2026-11-12 02:14–02:35: WALK candidato 1 LISTO para veredicto — 12 frames, 11 fps, ChatGPT conv 6af568e5-9200-83ea-b1d7-8e3e06504c98 (nueva conversación). Strip f2 con Remove BG (el primer intento salió con fondo blanco; la regeneración transparente vino con solo 10 figuras, así que se aplicó Remove BG al original de 12). Verificado por canal alfa: 80.3% totalmente transparente; 12 figuras detectadas, 1 pieza real por frame (+ motas de 1–16 px en algunos frames, invisibles a tamaño de juego). Look = idle aprobado (cristal negro/morado, glow magenta, núcleo rojo). GIFs: crystal_beast_walk_candidate1.gif + compare_old_vs_new_walk_candidate1.gif + contact_sheet_walk.png en hidden_files/overnight-loop/final-boss/walk/. ADVERTENCIA HONESTA: el paso es SUTIL — las 12 figuras son casi idénticas, solo pequeños cambios de patas y un bob suave; Angelo debe juzgar si la zancada es suficiente. NADA integrado — espera su veredicto. Código esta noche: SIN ITEM (item 1 hecho en v71, item 3 vacío) — no se construyó APK nuevo; el APK vigente sigue siendo v76 (versionCode 40, MD5 8a8c1d1d2ad137051d8d6a9a13125a0f).

### 3. Barra de volumen de música en el menú — PENDIENTE (pedido por Angelo 2026-11-12 21:1x, en llamada)
- Ya existe mute de música y de sonido, pero Angelo quiere un dial o barra en el menú para bajar y subir la música manualmente.
- Implementar SOLO después de su veredicto de v80 (él está probando v80 ahora). Cuando se implemente: primero GIF de ejemplo para su veredicto, luego integración.
- Estado: pendiente, no empezar.

### 4. Fullscreen / modo inmersivo — [x] HECHO 2026-11-13 (v82)
- Al abrir el juego los botones de navegación del Galaxy se quedan abajo; quiere que entre automático a fullscreen.
- Implementado: modo inmersivo sticky nativo en MainActivity (sin plugin): API 30+ con WindowInsetsController (hide systemBars + BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE + setDecorFitsSystemWindows(false)); fallback legacy IMMERSIVE_STICKY para API <30. Re-aplica en onWindowFocusChanged.
- Estado: [x] terminado 2026-11-13 (v82, versionCode 46, commit local 50beceb). tsc 0, vite limpio, APK 205.8 MB, MD5 f8213be676ad839810e6e542e21ccb83, ZIP OK, versionCode 46 verificado por aapt2, MainActivity compilada con hideSystemBars() verificado por javap. APK: ~/workspace/your_files/AngelysWorld-v82-TEST.apk. NOTA: el primer `./gradlew assembleDebug` falló en extractDebugAnnotations (lint-gradle sin red, esperado) y el APK quedó STALE (mismo MD5 que v81) — se reconstruyó con `-x :capacitor-android:extractDebugAnnotations`, BUILD SUCCESSFUL, APK fresco. Veredicto en teléfono pendiente (comportamiento inmersivo NO verificable en la VM).

### 5. Efecto de estrella en el Star Shield (invencible 15s) — PENDIENTE GIF (pedido por Angelo 2026-11-12 21:22)
- Al coger la estrella es invencible 15 segundos (SHIELD_MS=15000 verificado, Player.ts:69) y hoy "no tiene efecto".
- OJO: sí existe un tint arcoíris cíclico (SHIELD_TINTS, Player.ts:702) — él no lo percibe, así que no basta. Quiere un efecto de estrella visible sobre Angely durante los 15s.
- Regla GIF primero: preparar GIF de propuesta (estrellas orbitando / destellos dorados) para su veredicto, luego integrar. No integrar sin su "sí".
- Estado: pendiente, GIF por hacer.

### 6. Sprites de nado inconsistentes — PENDIENTE VEREDICTO (reportado por Angelo 2026-11-12 21:23)
- "Se ven como diferentes size, como diferentes character, como si fuesen diferentes personas."
- Medido 2026-11-12 (alpha bboxes, angely_swim.webp, celdas 280px): swim (fr 0–23) ancho 189–252px (varía 33%), alto 82–102px; float (24–35) alto 237–240px; up (36–43) alto 188–201px. Misma escala 0.432 en juego: nadando mide 35–44px de alto, flotando 102–104px. GIF del ciclo a 18fps: `~/workspace/qa_tmp/v81/swim_cycle_18fps.gif`.
- Fix = trabajo de sprites (no código): contact sheet + GIF para que señale qué frames están mal; regen con regla de todas-las-originales-primero, o arreglo offline. Nada sin su veredicto.
- Estado: pendiente de su veredicto sobre el GIF.

### 7. Hitbox del swing de la espada — PENDIENTE MEDICIÓN + GIF (reportado por Angelo 2026-11-12 21:19)
- "Se ve que le estoy dando al aire, pero en realidad le estoy dando al enemigo."
- Verificado: el reach NO cambió desde v78 (130 en suelo / 120 en aire, Player.ts, git show 0d47c8c idéntico). La causa que le dijeron ("el sprite creció pero el hitbox se quedó grande") NO está verificada — no repetirla.
- Próximo paso: medir la punta de la espada en los frames del strike (local 2–5) contra el rect de 130px, y mandar GIF antes de tocar nada.
- Estado: pendiente, GIF por hacer.

### 8. [x] Gema del spring en 9-2 fuera de pantalla — HECHO 2026-11-13 (v83)
- 9-2 Bubble Falls (meta: 6 gemas) pone su 6ta gema en (7355, -60): 60px SOBRE la pantalla. La cámara en modo run no baja de y=0, así que no se ve. El portal exige 6/6, así que con 5/6 queda sellado sin gema visible.
- Solo se roza en una ventana de ~30ms con salto aguantado y velocidad sub-máxima (apex spring ~391px, cuerpo 40x96, caja 44x44) — en juego normal es inalcanzable. Misma clase que la gema de 3-2 en y=-80, arreglada 2026-10-23.
- GIF esquemático (no gameplay): `goals/angely-s-world-game/hidden_files/overnight-loop/sweep-2026-11-13/gem_9-2_spring_schematic.gif`. Detalle y evidencia en `sweep-log.md`.
- Fix integrado: gema del spring bajada a nivel del muro (`Y - 4*BLOCK_H - 50`, y=20 con Y=350, visible como el corazón). Angelo lo ordenó 2026-11-13 06:17 ("Arreglalo").
- Estado: [x] terminado 2026-11-13 (v83, versionCode 47). Checker `check-levels.cjs`: 9-2 limpio, 6/6 gemas en pantalla. tsc 0, vite limpio, APK 205.8 MB, MD5 78907dfb5624e0e7d7bfcb77f84a1d7c, ZIP OK. APK: ~/workspace/your_files/AngelysWorld-v83-TEST.apk.

### 9. Bajar escalera en táctil imposible (cap. 11 PRUEBA) — PENDIENTE VEREDICTO
- En el teléfono (HUD táctil, JUMP + ACTION) Angely puede SUBIR la escalera (mantener JUMP → upHeld) pero NO bajarla: `downHeld` no tiene fuente táctil (`src/input/controls.ts:64` — solo teclado DOWN/S o gamepad; comentario: "Touch has no down button yet"). El joystick calcula `dy` pero solo escribe `touchState.axis` con `dx` (`src/scenes/HudScene.ts:676`). Mientras trepa, bajar exige `input.downHeld` (`src/entities/Player.ts:325`), siempre falso en táctil; entrar a la escalera desde arriba hacia abajo está bloqueado (`Player.ts:352-356`).
- Alcance: NO tranca los layouts actuales de ch11 — 11-1 baja por el roto del piso, 11-2 baja caminando por los bordes; las escaleras solo se usan para subir. Pero en táctil la escalera es solo-de-subida: si Angely la agarra a medio salto (JUMP mantenido = upHeld) no hay descenso controlado, solo soltarse con JUMP y caer. Cualquier layout futuro que pida bajar por escalera en el teléfono no se puede jugar.
- GIF esquemático (no gameplay): `goals/angely-s-world-game/hidden_files/overnight-loop/sweep-2026-11-13-afternoon/ladder_touch_down_schematic.gif` (720x460, 36f). Detalle y evidencia en `sweep-log.md`.
- Fix pendiente de su decisión (no integrar sin su "sí"): opciones — que el joystick hacia abajo alimente `downHeld`; que ACTION en escalera = bajar; o un botón de bajar en el HUD. La regla del HUD es JUMP + ACTION solo, así que es decisión de Angelo.
- Estado: pendiente, GIF por veredicto. Nada integrado (código ch11 PRUEBA, sin commit).

## Historial

- 2026-11-08: cola creada. Loop propuesto por Angelo ("loop de arreglar el juego overnight"). Sin correr aún.
- 2026-11-08 21:58: Angelo confirmó montar el loop, jefe final primero.
- 2026-11-08 21:59: Angelo aclaró que las "páginas web" de las poses son los MANIQUÍS Shisei.
- 2026-11-09 ~02:14: primera corrida del loop. Código: v71 (special_v3 fuera, 205.0 MB, commit local 0edf015). Sprites: candidato idle Crystal Beast #1 listo para veredicto (10 fr, transparente real, estilo más detallado que el flat actual).
