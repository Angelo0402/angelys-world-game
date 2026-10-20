# Game Feel Playbook — Angely's World
**Fecha:** 2026-10-17 · **Fuente:** 4 reels que Angelo pasó (investigados, no solo vistos)

## Reel 1 — @vasilev.yegor — "How to make a punch juicy" (atacante)
`https://www.instagram.com/reel/DecdQ9ltnjf/` — 79.7k likes

| Técnica | Estado en el juego |
|---|---|
| 1. FLASH blanco al impacto | ✅ `Enemy.takeDamage` → `setTintFill(0xffffff)` 80ms |
| 2. Sonido WHACK en el frame | ✅ `Audio.sfx("enemy_hit")`, `sword_hit` |
| 3. Partículas direccionales | ✅ `vfx.hitSpark()` |
| 4. Knockback enemigo + rebote jugador | ✅ enemigo sí / 🆕 **rebote jugador implementado hoy** (`Player.applyRecoil`) |
| 5. Screen shake + FREEZE | ✅ shake sí / 🆆 **hit-stop implementado hoy** (`GameScene.hitStop`: 60ms espada, 90ms martillo) |
| Bonus: enemigo explota en cubos | ✅ `vfx.enemyPoof()` |

**Implementado 2026-10-17** (sin commit, sin push — pendiente tu visto bueno):
- `GameScene.hitStop(ms)` — pausa física breve al impacto. Espada: 60ms + shake 90/0.006 (antes 70/0.004). Martillo: 90ms.
- `Player.applyRecoil(dir)` — impulso de 170 por 120ms en dirección contraria al golpe.
- Verificado: `tsc` limpio, `vite build` OK, juego bootea sin errores JS, mecánica de hit-stop confirmada funcional (el test headless corre a 4fps y todo tarda ~18x — en teléfono real los 60ms son 60ms).
- Nota del top comment del reel: "players will ask for the off button" — considerar toggle de screen shake en settings a futuro.

## Reel 2 — @motionbykrit — "Getting hit: 7 tricks stacked" (el que recibe)
`https://www.instagram.com/reel/DelJO3qusJE/`

| Técnica | Estado |
|---|---|
| 1. Hitbox < cuerpo (misses justos) | ❓ revisar `hitArea` rects |
| 2. Freeze + Flash + shake | ✅ (con lo de hoy) |
| 3. Impact Frame (2 frames B/N al contacto) | ❌ no existe |
| 4. Pushback | ✅ |
| 5. Partículas en el arco del arma | ✅ (hitSpark) |
| 6. Damage numbers / health bar | ❌ no hay damage numbers (bosses sí tienen barra) |
| 7. Mercy frames (parpadeo invencible) | ✅ `invulnUntil` / `INVULN_MS` |
| Bonus: viñeta roja + heartbeat a low HP | ❌ no existe |
| Bonus: slow-mo cinemático en el golpe final | ❌ no existe |

## Reel 3 — @motionbykrit — "Make an explosion feel BIG"
`https://www.instagram.com/reel/Deh3qQ0RU4e/`

| Técnica | Estado |
|---|---|
| 1. Anticipación (hinchar + flash rojo antes) | ❓ verificar si hay barriles/explosivos |
| 2. Impact frame B/N + fireball (crece rápido, muere lento) | ❌ |
| 3. Sonido crack + boom profundo | ❓ |
| 4. Debris + humo que cuelga | ✅ parcial (poof, dust) |
| 5. Shake + shockwave ring en el piso | ✅ shake / ❌ shockwave ring |
| Bonus: slow-mo a mitad de velocidad en el peak | ❌ |

## Reel 4 — @motionbykrit — "Make a dash feel FAST"
`https://www.instagram.com/reel/DehPnhjxUvB/`

| Técnica | Estado |
|---|---|
| 1. Wind-up (inclinarse atrás) | N/A — el jugador no tiene dash (solo KnightBoss) |
| 2. Squash & stretch | N/A |
| 3. Whoosh + skrrt | N/A |
| 4. Afterimages | N/A |
| 5. Speed lines + polvo | N/A |
| Bonus: cámara lidera el dash | N/A |

## Siguiente (propuesta, sin hacer)
1. **Impact Frame B/N** (reels 2 y 3 lo piden) — 2 frames de overlay blanco/negro en golpes fuertes. Barato, alto impacto visual.
2. **Damage numbers** (reel 2) — números flotantes de daño. El juego ya trackea `amount` en `takeDamage`.
3. **Slow-mo en kill final** (reels 2 y 3) — `time.timeScale = 0.5` por ~300ms al matar boss.
4. Revisar hitboxes justos (reel 2.1) si hay quejas de "me pegó sin tocarme".

Nada de esto toca física, cámara o controles base — solo capas de feel.

## Reel 5 — @motionbykrit — "Game Dev Secrets Part 3: Why a boss kill feels so GOOD"
`https://www.instagram.com/reel/DesK-ImRqfA/`

10 técnicas para que matar un boss se sienta épico (demo: "Lava Core Golem", 400 HP):

| Técnica | Qué es | Estado en Angely's World |
|---|---|---|
| 1. Boss HP bar con checkpoints | Barra con marcas de fase (ej. checkpoint a mitad) | ❌ |
| 2. THE TRANSITION | Transición de fase: boss se vuelve IMMUNE, cambia arena/ataques | ❌ |
| 5. THE TWIST | El boss deja hazards atrás (fuego en el piso) | ❌ |
| 7. THE RETRY | Si el jugador muere, mostrar qué tan cerca estuvo ("6% LEFT!") | ❌ |
| 10. THE DEATH | Kill final: SLOW-MO → FREEZE → FLASH | ❌ (tenemos hitStop, falta la secuencia completa) |

Notas:
- El #10 conecta directo con lo que el reel 2/3 ya pedía: slow-mo en kill final (`timeScale = 0.5` ~300ms). La secuencia completa sería: último golpe → hitStop(120) → slow-mo 0.3 por 400ms → freeze 2 frames → flash blanco → muerte.
- El #7 ("show how close") es barato: en game over de boss, mostrar "¡Te faltó X%!" — incentiva el retry.
- El #1 (checkpoints en la barra) es UI puro, sin tocar lógica de daño.

Prioridad si se retoma feel: #10 primero (extiende hitStop que ya existe), luego #7, luego #1.

## Reel 6 — @vasilev.yegor — "How to make ICE SPIKES juicy!"
`https://www.instagram.com/reel/DetoueoNkIr/`

Receta de 8 pasos para que un ataque de púas de hielo/cristal que salen del suelo se sienta poderoso. Es una secuencia completa (telegraph → erupción → clímax → residuo), no trucos sueltos:

| Paso | Qué es | Uso en Angely's World |
|---|---|---|
| 1. CHARGE UP! | Anticipación: energía/brillo se acumula antes del ataque | Telegraph de cualquier ataque de boss |
| 2. SPIKES! | No un carámbano solo: púas que SALEN del suelo en cadena | Ataque del boss de Crystal Veil / picos del piso |
| 3. GROW! | Cada púa más grande según se acerca al objetivo | Escalada visual hacia el jugador |
| 4. FAN OUT! | Púas pequeñas a los lados, forma de abanico | Cobertura lateral, evita que se vea "línea fina" |
| 5. CRACK THE FLOOR! | El suelo se agrieta alrededor del impacto | Decal de daño en el piso + peso del golpe |
| 6. BIG FINISH! | La erupción mayor al final, sobre el objetivo | Clímax del ataque |
| 7. SHATTER! | Las púas se rompen en pedazos | Debris al terminar el ataque |
| 8. FROST! | Escarcha/niebla que queda flotando | Residuo ambiental post-ataque |

Notas:
- Conecta directo con Crystal Veil: el boss ya trabaja con cristales que suben del piso ("The floor is glowing, move before the crystals rise") y beams — esta receta le da el feel completo a ese patrón de ataque.
- El paso 1 (charge/telegraph) es el más importante para gameplay justo: el jugador necesita leer el ataque antes de que salga, igual que el floor-glow que ya existe.
- Nada implementado todavía; es referencia para cuando se toque el feel de bosses/cristal. Sin tocar física ni controles.

## Reel 7 — @motionbykrit — "Game Dev Secrets: Why is the Chrome game a DINOSAUR?"
`https://www.instagram.com/reel/DetMMkyx48K/`

Trivia de diseño del Dino de Chrome; dos puntos transferibles:
- **Hitboxes que perdonan**: el dino usa hitboxes mucho más pequeños que el sprite — el sprite puede rozar el cactus sin morir. Refuerza el punto ya anotado del reel 2 (hitboxes justos); si hay quejas de "me pegó sin tocarme", achicar hitboxes del jugador/enemigos antes de tocar otra cosa.
- **Segundo obstáculo a mitad de run**: los pájaros entran a los ~450 puntos, a otra altura, cuando el jugador ya dominó los cactus — romper el piloto automático con un patrón distinto. Nota de diseño para niveles largos/chase: introducir la variante cuando el patrón base ya se siente automático.

Nada implementado; referencia.
