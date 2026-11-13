# Cola diaria — Angely's World (loop de las 6 AM)

El loop diario toma el PRIMER item de esta lista cada mañana, lo hace, lo verifica y deja el APK + reporte. Un item por día. Cuando un item se termina, se marca [x] con fecha y se pasa al siguiente. ANTES de la cola, cada mañana el loop hace un SWEEP: caza UN bug nuevo o una mejora concreta del juego y lo propone con GIF para veredicto de Angelo — nada se integra sin su aprobado.

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

## Historial

- 2026-11-08: cola creada. Loop propuesto por Angelo ("loop de arreglar el juego overnight"). Sin correr aún.
- 2026-11-08 21:58: Angelo confirmó montar el loop, jefe final primero.
- 2026-11-08 21:59: Angelo aclaró que las "páginas web" de las poses son los MANIQUÍS Shisei.
- 2026-11-09 ~02:14: primera corrida del loop. Código: v71 (special_v3 fuera, 205.0 MB, commit local 0edf015). Sprites: candidato idle Crystal Beast #1 listo para veredicto (10 fr, transparente real, estilo más detallado que el flat actual).
